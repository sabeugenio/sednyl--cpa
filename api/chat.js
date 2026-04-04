import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from './_auth.js';
import fs from 'fs';

const CHATBOT_RULES=fs.readFileSync('./rules/chatbot_rules.txt', 'utf8');

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.GEMINIAI_KEY) {
      return res.status(500).json({ error: 'GEMINIAI_KEY is missing from environment variables' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_KEY);

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: CHATBOT_RULES,
    });

    // Remap messages to Gemini history format
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

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Failed to get response from AI' });
  }
}
