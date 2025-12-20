import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* ------------------ CLEAN AI RESPONSE ------------------ */
function extractJSON(text: string): any[] {
  // Remove ```json and ``` wrappers if present
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ JSON parse failed. Raw AI output:", text);
    return [];
  }
}

/* ------------------ CONTROLLER ------------------ */
export const getReplySuggestions = async (
  req: Request,
  res: Response
) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json([]);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a chat assistant. Reply ONLY with a JSON array of short reply suggestions. Do not add explanation.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    const aiText =
      completion.choices[0].message.content || "[]";

    const replies = extractJSON(aiText);

    return res.json(replies);
  } catch (err) {
    console.error("❌ AI error:", err);
    return res.json([]);
  }
};
