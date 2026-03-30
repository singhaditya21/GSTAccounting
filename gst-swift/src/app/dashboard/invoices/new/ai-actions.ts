"use server";

import { db } from "@/lib/db";
import { enforceRoleAccess } from "@/lib/auth-guard";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function generateInvoiceFromText(prompt: string) {
  const { member, isAuthorized } = await enforceRoleAccess(["OWNER", "ACCOUNTANT", "BRANCH_MANAGER"]);
  if (!isAuthorized || !member) throw new Error("Unauthorized Access Attempt");

  // Fetch contextual data to inject into LLM Context Window
  const customers = await db.customer.findMany({
    where: { orgId: member.orgId },
    select: { id: true, legalName: true, tradeName: true }
  });
  
  const products = await db.product.findMany({
    where: { orgId: member.orgId },
    select: { id: true, name: true, hsnSac: true, defaultPrice: true }
  });

  const sysPrompt = `
You are an expert AI Autonomous Billing Engine. The user provides a natural language prompt to draft an invoice.
You MUST map the user's request to the exact database IDs provided below.

Available Customers:
${JSON.stringify(customers)}

Available Products:
${JSON.stringify(products)}

Respond ONLY with RAW JSON in exactly this schema (do NOT wrap in markdown).
Schema:
{
  "customerId": "string (the exact ID of the best matching customer)",
  "items": [
    {
      "productId": "string (the exact ID of the best matching product)",
      "quantity": number (default 1),
      "unitPrice": number (use the defaultPrice if not specified, otherwise use what user says),
      "discount": number (default 0)
    }
  ]
}

If a user specifies a customer or product that does not perfectly match, do your best fuzzy match based on legalName, tradeName, or product name.
If you truly cannot deduce it, leave the ID as an empty string "".
DO NOT INCLUDE ANY OTHER TEXT IN YOUR RESPONSE EXCEPT THE JSON.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "meta/llama-3.1-70b-instruct", // Powerful context routing
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const aiText = response.choices[0]?.message?.content || "{}";
    const cleanedText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Attempt parsing
    const parsedData = JSON.parse(cleanedText);
    
    // Optional SaaS monetization deduct token here
    // We will bypass deducting tokens for simple generation unless specified, keeping it free for now while in beta.

    return parsedData;
  } catch (error) {
    console.error("AI Generation Failed:", error);
    throw new Error("AI failed to cleanly map your intent. Please try standard form execution.");
  }
}
