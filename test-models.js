import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_KEY);
async function list() {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  try {
      const result = await model.generateContent("Hello");
      console.log(result.response.text());
  } catch (err) {
      console.error(err);
  }
}
list();
