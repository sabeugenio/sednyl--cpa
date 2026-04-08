import express from 'express';
import OpenAI from 'openai';
import fs from 'fs/promises';
import url from 'url';
import path from 'path';
import pool from '../db.js';
import { expressAuth } from '../auth.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const CYCLE_HOURS = 3;
const VERSE_POOL_SIZE = 25;

router.use(expressAuth);

// Seed 25 Bible verses using GPT
async function seedVerses(userId) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

  const rulesPath = path.join(__dirname, '..', 'rules', 'bible_rules.txt');
  const systemInstruction = await fs.readFile(rulesPath, 'utf8');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 1.0,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: systemInstruction + '\n\nWhen asked for multiple verses, return a JSON object with a "verses" array. Each item must have "verse" and "reference" fields.',
      },
      {
        role: 'user',
        content: `Give me ${VERSE_POOL_SIZE} different random encouraging Bible verses. Make them diverse — about strength, perseverance, peace, wisdom, hope, comfort, joy, and faith. Return as JSON: {"verses": [{"verse": "...", "reference": "Book Chapter:Verse"}, ...]}`,
      },
    ],
  });

  const raw = completion.choices[0].message.content.trim();
  const parsed = JSON.parse(raw);
  const verses = parsed.verses || [];

  // Insert all verses into the database
  for (let i = 0; i < verses.length; i++) {
    await pool.query(
      'INSERT INTO bible_verses (user_id, verse, reference, sort_order) VALUES ($1, $2, $3, $4)',
      [userId, verses[i].verse, verses[i].reference, i]
    );
  }

  return verses.length;
}

router.get('/verse', async (req, res) => {
  try {
    // Check how many verses the user has
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM bible_verses WHERE user_id = $1',
      [req.user.id]
    );
    const verseCount = parseInt(countRows[0].cnt);

    // If no verses yet, seed them
    if (verseCount === 0) {
      try {
        if (!process.env.OPENAI_KEY) {
          throw new Error('OPENAI_KEY is missing');
        }
        await seedVerses(req.user.id);
      } catch (seedErr) {
        console.error('Failed to seed verses:', seedErr.message);
        // Return a fallback verse
        return res.json({
          verse: "I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world.",
          reference: 'John 16:33',
        });
      }
    }

    // Check when the last verse rotation happened using DATABASE time
    const { rows: timeCheck } = await pool.query(
      `SELECT value,
              EXTRACT(EPOCH FROM (NOW() - value::timestamp)) / 3600 AS hours_ago
       FROM settings
       WHERE user_id = $1 AND key = 'verse_rotated_at'`,
      [req.user.id]
    );

    const hoursAgo = timeCheck.length > 0 ? parseFloat(timeCheck[0].hours_ago) : null;

    // Get current verse index
    const { rows: indexRows } = await pool.query(
      `SELECT value FROM settings WHERE user_id = $1 AND key = 'verse_index'`,
      [req.user.id]
    );
    let currentIndex = indexRows.length > 0 ? parseInt(indexRows[0].value) : 0;

    // If 3 hours have passed (or first time), rotate to next verse
    if (hoursAgo === null || hoursAgo >= CYCLE_HOURS) {
      // Get total verse count for wrapping
      const { rows: totalRows } = await pool.query(
        'SELECT COUNT(*) AS cnt FROM bible_verses WHERE user_id = $1',
        [req.user.id]
      );
      const total = parseInt(totalRows[0].cnt);

      // Move to next verse (or start at 0 if first time)
      currentIndex = hoursAgo === null ? 0 : (currentIndex + 1) % total;

      // Update index and rotation time using DB time
      const upsertSql = `
        INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
        ON CONFLICT(user_id, key) DO UPDATE SET value = $3
      `;
      const { rows: nowRows } = await pool.query(`SELECT NOW()::text AS db_now`);
      await pool.query(upsertSql, [req.user.id, 'verse_index', String(currentIndex)]);
      await pool.query(upsertSql, [req.user.id, 'verse_rotated_at', nowRows[0].db_now]);
    }

    // Fetch the current verse by sort_order
    const { rows: verseRows } = await pool.query(
      `SELECT verse, reference FROM bible_verses
       WHERE user_id = $1
       ORDER BY sort_order
       LIMIT 1 OFFSET $2`,
      [req.user.id, currentIndex]
    );

    if (verseRows.length > 0) {
      const remaining = hoursAgo !== null ? Math.max(0, CYCLE_HOURS - hoursAgo) : CYCLE_HOURS;
      return res.json({
        verse: verseRows[0].verse,
        reference: verseRows[0].reference,
        hours_remaining: remaining.toFixed(1),
      });
    }

    // Shouldn't happen, but fallback
    res.json({
      verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.",
      reference: 'Jeremiah 29:11',
    });
  } catch (err) {
    console.error('Bible verse error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
