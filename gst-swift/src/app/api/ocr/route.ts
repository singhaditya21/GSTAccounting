import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: { include: { tenantSettings: true } } }
    });

    if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

    const settings = member.organization.tenantSettings;
    if (settings && settings.aiOcrTokensRemaining <= 0) {
      return NextResponse.json({ 
        error: "Insufficient AI Quota. You have 0 tokens remaining. Please upgrade your SaaS Subscription to continue automating Extractions." 
      }, { status: 402 });
    }

    // Pass the base64 string to the Multimodal NVIDIA model
    // Using Llama-3.2 Vision which is specialized in zero-shot document extraction
    const response = await openai.chat.completions.create({
      model: "meta/llama-3.2-11b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `You are an expert Accountant AI. Extract the exact monetary and tax parameters from this uploaded vendor invoice/receipt.
              Respond ONLY in raw JSON format with NO markdown wrapping.
              Schema mapping: { "amount": number, "taxAmount": number, "date": "YYYY-MM-DD", "description": "String up to 50 chars", "gstin": "15 char Indian GSTIN or null" }
              If a field cannot be found, use null.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temp for maximum deterministic extraction
    });

    const aiText = response.choices[0]?.message?.content || "{}";
    
    // Clean any markdown formatting the LLM might stubbornly return
    const cleanedText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanedText);

    // Deduct SaaS Token successfully
    if (settings) {
      await db.tenantSettings.update({
        where: { id: settings.id },
        data: { aiOcrTokensRemaining: settings.aiOcrTokensRemaining - 1 }
      });
    }

    return NextResponse.json({ data: parsedData, tokensRemaining: settings ? settings.aiOcrTokensRemaining - 1 : 0 });

  } catch (error: any) {
    console.error("VLM OCR Failed:", error);
    return NextResponse.json({ error: error.message || "Failed to parse receipt visually" }, { status: 500 });
  }
}
