import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// In-memory cache — persists across page reloads, resets only on server restart
let cachedVerse = null;   // { verse, reference }
let cachedAt = null;      // Date when the verse was set
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour

// GET /api/verse — always returns a verse, changes every 1 hour
router.get('/verse', async (req, res) => {
  try {
    const now = Date.now();

    // Return cached verse if still within the 1-hour window
    if (cachedVerse && cachedAt && (now - cachedAt) < CACHE_DURATION_MS) {
      return res.json({
        verse: cachedVerse.verse,
        reference: cachedVerse.reference,
        expires_at: new Date(cachedAt + CACHE_DURATION_MS),
      });
    }

    // Time to get a new verse
    let newVerse;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 1.0,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content:
              'You are a Bible verse assistant. You MUST return ONLY a single Bible verse. ' +
              'The verse must be encouraging, give wisdom, provide strength, or lift the mood when feeling down. ' +
              'Return ONLY valid JSON in this exact format: {"verse": "...", "reference": "Book Chapter:Verse"} ' +
              'Do NOT include any other text, explanation, commentary, or markdown formatting. Just raw JSON.',
          },
          {
            role: 'user',
            content: 'Give me a random encouraging Bible verse.',
          },
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
    } catch (aiErr) {
      console.warn('OpenAI unavailable, using fallback verse:', aiErr.message);
    }

    // Cache in memory
    cachedVerse = newVerse;
    cachedAt = now;

    res.json({
      verse: cachedVerse.verse,
      reference: cachedVerse.reference,
      expires_at: new Date(cachedAt + CACHE_DURATION_MS),
    });
  } catch (err) {
    console.error('Bible verse error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
