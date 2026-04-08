import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs/promises';
import url from 'url';
import path from 'path';
import { expressAuth } from '../auth.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.use(expressAuth);

// Try Gemini first
async function tryGemini(messages, systemInstruction) {
  if (!process.env.GEMINIAI_KEY) {
    throw new Error('GEMINIAI_KEY is missing');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_KEY);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction,
  });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1].content;

  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  });

  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
}

// Try OpenAI as fallback
async function tryOpenAI(messages, systemInstruction) {
  if (!process.env.OPENAI_KEY) {
    throw new Error('OPENAI_KEY is missing');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

  const openaiMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1024,
    messages: openaiMessages,
  });

  return completion.choices[0].message.content;
}

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const rulesPath = path.join(__dirname, '..', 'rules', 'chatbot_rules.txt');
    const systemInstruction = await fs.readFile(rulesPath, 'utf8');

    // Try Gemini first
    try {
      const reply = await tryGemini(messages, systemInstruction);
      return res.json({ reply });
    } catch (geminiErr) {
      console.warn('Gemini failed, trying OpenAI fallback:', geminiErr.message);
    }

    // Fallback to OpenAI
    try {
      const reply = await tryOpenAI(messages, systemInstruction);
      return res.json({ reply });
    } catch (openaiErr) {
      console.warn('OpenAI also failed:', openaiErr.message);
    }

    // Both failed — friendly error
    return res.status(503).json({
      error: 'ai_unavailable',
      reply: "I'm taking a short break right now 🍵💤 Both of my brain engines are resting. Please try again in a few minutes — I'll be back to help you crush those CPALE topics! 🙏✨",
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

export default router;
