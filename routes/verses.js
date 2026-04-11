import express from 'express';
import url from 'url';
import path from 'path';
import pool from '../db.js';
import { expressAuth } from '../auth.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const CYCLE_MINUTES = 120; // 2 hour rotation cycle
const VERSE_POOL_SIZE = 25;

function toNonNegInt(n, fallback = 0) {
  const x = typeof n === 'bigint' ? Number(n) : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.floor(x));
}

router.use(expressAuth);

// Seed 25 Bible verses using GPT
// AI Seeding removed as per user request. 
// Verses are now managed manually in the database.

router.get('/verse', async (req, res) => {
  try {
    // Check how many verses the user has
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM bible_verses WHERE user_id = $1',
      [req.user.id]
    );
    const verseCount = toNonNegInt(countRows[0]?.cnt, 0);

    // If no verses exist, the rotation will fallback to the static verse at the end

    // Check when the last verse rotation happened using DATABASE time
    const { rows: timeCheck } = await pool.query(
      `SELECT value,
              EXTRACT(EPOCH FROM (NOW() - value::timestamptz)) / 60 AS minutes_ago
       FROM settings
       WHERE user_id = $1 AND key = 'verse_rotated_at'`,
      [req.user.id]
    );

    let minutesAgo = timeCheck.length > 0 ? parseFloat(timeCheck[0].minutes_ago) : null;
    // Invalid or missing EXTRACT (bad/corrupt timestamp value) → treat like "never rotated"
    if (minutesAgo !== null && !Number.isFinite(minutesAgo)) {
      minutesAgo = null;
    }

    // Get current verse index safely
    const { rows: indexRows } = await pool.query(
      `SELECT value FROM settings WHERE user_id = $1 AND key = 'verse_index'`,
      [req.user.id]
    );

    let currentIndex = 0;
    if (indexRows.length > 0) {
      const raw = indexRows[0].value;
      const parsedIndex = parseInt(String(raw ?? ''), 10);
      if (Number.isFinite(parsedIndex)) currentIndex = toNonNegInt(parsedIndex, 0);
    }

    // If 2 hours has passed (or first time), rotate to next verse
    let hasRotated = false;
    if (minutesAgo === null || minutesAgo >= (CYCLE_MINUTES - 0.1)) {
      hasRotated = true;
      
      // Get total verse count for wrapping
      const { rows: totalRows } = await pool.query(
        'SELECT COUNT(*) AS cnt FROM bible_verses WHERE user_id = $1',
        [req.user.id]
      );
      const total = toNonNegInt(totalRows[0]?.cnt, 0);

      // Move to next verse (reset to 0 if no verses or overflow)
      if (total === 0) {
        currentIndex = 0;
      } else if (minutesAgo === null) {
        currentIndex = 0;
      } else {
        const next = (toNonNegInt(currentIndex, 0) + 1) % total;
        currentIndex = Number.isFinite(next) ? next : 0;
      }

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

    // Fetch the current verse by sort_order (OFFSET must be a finite bigint — never NaN)
    currentIndex = toNonNegInt(currentIndex, 0);
    let safeOffset = 0;
    if (verseCount > 0) {
      const idx = toNonNegInt(currentIndex, 0);
      safeOffset = idx % verseCount;
    }
    const offsetParam = toNonNegInt(safeOffset, 0);

    const { rows: verseRows } = await pool.query(
      `SELECT id, verse, reference FROM bible_verses
       WHERE user_id = $1
       ORDER BY sort_order ASC, id ASC
       LIMIT 1 OFFSET $2`,
      [req.user.id, offsetParam]
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
