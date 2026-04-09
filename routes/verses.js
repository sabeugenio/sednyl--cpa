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
const CYCLE_MINUTES = 120; // 2 hour rotation cycle
const VERSE_POOL_SIZE = 25;

router.use(expressAuth);

// Seed 25 Bible verses using GPT
async function seedVerses(userId) {
  console.log(`[Verse API] Seeding fresh verses for user ${userId}...`);
  // Clear existing verses first to avoid duplicates
  await pool.query('DELETE FROM bible_verses WHERE user_id = $1', [userId]);

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
        content: `Give me ${VERSE_POOL_SIZE} unique and different encouraging Bible verses. 
        IMPORTANT: Use many different books (Psalms, Proverbs, Isaiah, Gospels, Epistles, etc). 
        Do NOT repeat any verses. Make them about strength, perseverance, peace, wisdom, hope, comfort, joy, and faith.
        Return as JSON: {"verses": [{"verse": "...", "reference": "Book Chapter:Verse"}, ...]}`,
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

    // If not enough verses, or none yet, seed them
    if (verseCount < VERSE_POOL_SIZE) {
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
              EXTRACT(EPOCH FROM (NOW() - value::timestamptz)) / 60 AS minutes_ago
       FROM settings
       WHERE user_id = $1 AND key = 'verse_rotated_at'`,
      [req.user.id]
    );

    const minutesAgo = timeCheck.length > 0 ? parseFloat(timeCheck[0].minutes_ago) : null;

    // Get current verse index
    const { rows: indexRows } = await pool.query(
      `SELECT value FROM settings WHERE user_id = $1 AND key = 'verse_index'`,
      [req.user.id]
    );
    let currentIndex = indexRows.length > 0 ? parseInt(indexRows[0].value) : 0;

    // If 2 hours has passed (or first time), rotate to next verse
    let hasRotated = false;
    if (minutesAgo === null || minutesAgo >= (CYCLE_MINUTES - 0.1)) {
      hasRotated = true;
      // Get total verse count for wrapping
      const { rows: totalRows } = await pool.query(
        'SELECT COUNT(*) AS cnt FROM bible_verses WHERE user_id = $1',
        [req.user.id]
      );
      const total = parseInt(totalRows[0].cnt);

      // Move to next verse (or start at 0 if first time)
      currentIndex = (minutesAgo === null) ? 0 : (currentIndex + 1) % total;

      // Update index and rotation time using DB time
      const upsertSql = `
        INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
        ON CONFLICT(user_id, key) DO UPDATE SET value = $3
      `;
      await pool.query(upsertSql, [req.user.id, 'verse_index', String(currentIndex)]);

      const upsertTimeSql = `
        INSERT INTO settings (user_id, key, value) VALUES ($1, $2, CURRENT_TIMESTAMP::text)
        ON CONFLICT(user_id, key) DO UPDATE SET value = CURRENT_TIMESTAMP::text
      `;
      await pool.query(upsertTimeSql, [req.user.id, 'verse_rotated_at']);
    }

    // Fetch the current verse by sort_order with deterministic fallback
    const { rows: verseRows } = await pool.query(
      `SELECT id, verse, reference FROM bible_verses
       WHERE user_id = $1
       ORDER BY sort_order ASC, id ASC
       LIMIT 1 OFFSET $2`,
      [req.user.id, currentIndex % Math.max(1, verseCount)]
    );

    if (verseRows.length > 0) {
      // If we just rotated, minutes_remaining should be the full cycle
      const effectiveMinutesAgo = hasRotated ? 0 : (minutesAgo || 0);
      const remainingMinutes = Math.max(0, CYCLE_MINUTES - effectiveMinutesAgo);

      return res.json({
        verse: verseRows[0].verse,
        reference: verseRows[0].reference,
        minutes_remaining: remainingMinutes.toFixed(1),
        current_index: currentIndex, // For debugging
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
