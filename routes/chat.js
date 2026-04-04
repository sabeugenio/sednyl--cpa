import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import url from 'url';
import path from 'path';
import { expressAuth } from '../api/_auth.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.use(expressAuth);

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.GEMINIAI_KEY) {
      return res.status(500).json({ error: 'GEMINIAI_KEY is missing from environment variables' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_KEY);

    const rulesPath = path.join(__dirname, '..', 'rules', 'chatbot_rules.txt');
    const systemInstruction = await fs.readFile(rulesPath, 'utf8');

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemInstruction,
    });

    // Remap messages to Gemini history format, except the last message which is the prompt
    // OpenAI: user/assistant
    // Gemini: user/model
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
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

export default router;
