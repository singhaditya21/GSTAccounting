"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: "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",
});

export async function suggestHsn(productName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const prompt = `You are a CBIC expert. Return ONLY a pure JSON object mapping the best match for "${productName}" with keys:
  {
    "hsn": "the 4, 6 or 8 digit code",
    "rate": 18 (number, e.g. 5, 12, 18, 28),
    "isService": false (boolean),
    "description": "Short 10-word marketing description"
  }
  Do not include markdown blocks, just the raw JSON.`;

  try {
     const completion = await client.chat.completions.create({
        model: "z-ai/glm4.7",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2, // Low temp for factual accuracy
     });

     let result = completion.choices[0]?.message?.content || "{}";
     // Basic cleanup in case GLM wraps it in markdown despite instructions
     result = result.replace(/```json/g, "").replace(/```/g, "").trim();
     
     return JSON.parse(result);
  } catch (err) {
     console.error("HSN AI Error", err);
     return null;
  }
}
