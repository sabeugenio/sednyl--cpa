import express from 'express';
import OpenAI from 'openai';
import fs from 'fs/promises';
import url from 'url';
import path from 'path';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000;

router.use(expressAuth);

router.get('/verse', async (req, res) => {
  try {
    const now = new Date();

    const { rows: recentVerses } = await pool.query(
      `SELECT * FROM bible_verses WHERE user_id = $1 AND generated_at > NOW() - INTERVAL '1 hour' ORDER BY generated_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (recentVerses.length > 0) {
      const cached = recentVerses[0];
      return res.json({
        verse: cached.verse,
        reference: cached.reference,
        expires_at: new Date(new Date(cached.generated_at).getTime() + CACHE_DURATION_MS),
      });
    }

    let newVerse;
    try {
      if (!process.env.OPENAI_KEY) {
        throw new Error('OPENAI_KEY is missing from environment variables');
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_KEY,
      });
      
      const rulesPath = path.join(__dirname, '..', 'rules', 'bible_rules.txt');
      const systemInstruction = await fs.readFile(rulesPath, 'utf8');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 1.0,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: systemInstruction,
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
    } catch (apiErr) {
      console.warn('OpenAI unavailable, using fallback verse:', apiErr.message);
      newVerse = {
        verse: "I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world.",
        reference: "John 16:33"
      };
    }

    await pool.query(
      'INSERT INTO bible_verses (user_id, verse, reference) VALUES ($1, $2, $3)',
      [req.user.id, newVerse.verse, newVerse.reference]
    );

    res.json({
      verse: newVerse.verse,
      reference: newVerse.reference,
      expires_at: new Date(now.getTime() + CACHE_DURATION_MS),
    });
  } catch (err) {
    console.error('Bible verse error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
