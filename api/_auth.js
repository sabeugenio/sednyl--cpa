import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

let supabase;

export async function requireAuth(req) {
  if (!supabase) {
    dotenv.config();
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  if (!supabase) {
    console.warn("Supabase credentials not found in env vars. Authentication bypassed for local development!");
    return '00000000-0000-0000-0000-000000000000';
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid token');
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Unauthorized: ' + (error?.message || 'Invalid user'));
  }

  return data.user.id;
}

// Express Middleware
export async function expressAuth(req, res, next) {
  try {
    const userId = await requireAuth(req);
    req.user = { id: userId };
    next();
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
