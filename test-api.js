import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_KEY);
    const systemInstruction = await fs.readFile('./rules/chatbot_rules.txt', 'utf8');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction });
    const chat = model.startChat({
        history: [{role: 'user', parts: [{text: 'Hello'}]}],
    });
    const result = await chat.sendMessage('How are you?');
    console.log('Gemini success:', result.response.text().slice(0, 100));
  } catch (e) {
    console.error('Gemini error:', e.message);
  }
}

import OpenAI from 'openai';
async function testOpenAI() {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
    const systemInstruction = await fs.readFile('./rules/bible_rules.txt', 'utf8');
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: 'Give me a random encouraging Bible verse.' },
        ],
    });
    console.log('OpenAI success:', completion.choices[0].message.content);
  } catch (e) {
    console.error('OpenAI error:', e.message);
  }
}

async function run() {
  await testGemini();
  await testOpenAI();
}
run();
