import pool from '../_db.js';
import OpenAI from 'openai';

const BIBLE_RULES = `You are a Bible verse assistant. You MUST return ONLY a single Bible verse. The verse must be encouraging, give wisdom, provide strength, or lift the mood when feeling down. Return ONLY valid JSON in this exact format: {"verse": "...", "reference": "Book Chapter:Verse"} Do NOT include any other text, explanation, commentary, or markdown formatting. Just raw JSON.`;

const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  try {
    // Check database for a recent verse (within cache duration)
    const { rows: recentVerses } = await pool.query(
      `SELECT * FROM bible_verses WHERE generated_at > NOW() - INTERVAL '1 hour' ORDER BY generated_at DESC LIMIT 1`
    );

    if (recentVerses.length > 0) {
      const cached = recentVerses[0];
      return res.status(200).json({
        verse: cached.verse,
        reference: cached.reference,
        expires_at: new Date(new Date(cached.generated_at).getTime() + CACHE_DURATION_MS),
      });
    }

    // Generate a new verse
    let newVerse;
    try {
      if (!process.env.OPENAI_KEY) {
        throw new Error('OPENAI_KEY is missing');
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 1.0,
        max_tokens: 200,
        messages: [
          { role: 'system', content: BIBLE_RULES },
          { role: 'user', content: 'Give me a random encouraging Bible verse.' },
        ],
      });

      const raw = completion.choices[0].message.content.trim();
      try {
        newVerse = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          newVerse = JSON.parse(match[0]);
        } else {
          throw new Error('Failed to parse OpenAI response');
        }
      }
    } catch (apiErr) {
      console.warn('OpenAI unavailable, using fallback verse:', apiErr.message);
      newVerse = {
        verse: "I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world.",
        reference: "John 16:33"
      };
    }

    // Save to database for caching
    await pool.query(
      'INSERT INTO bible_verses (verse, reference) VALUES ($1, $2)',
      [newVerse.verse, newVerse.reference]
    );

    return res.status(200).json({
      verse: newVerse.verse,
      reference: newVerse.reference,
      expires_at: new Date(Date.now() + CACHE_DURATION_MS),
    });
  } catch (err) {
    console.error('Bible verse error:', err);
    return res.status(500).json({ error: err.message });
  }
}
