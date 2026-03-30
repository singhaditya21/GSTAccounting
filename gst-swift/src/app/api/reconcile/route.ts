import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function POST(req: Request) {
  try {
    const { csvData, orgId } = await req.json();

    if (!csvData) {
      return NextResponse.json({ error: "No Bank Statement provided" }, { status: 400 });
    }

    // Capture Unpaid Invoices Context (The Knowledge Base for the LLM)
    const unpaidInvoices = await db.invoice.findMany({
      where: { orgId: orgId, status: { notIn: ["PAID", "CANCELLED"] } },
      include: { customer: true }
    });

    const invoiceSummaries = unpaidInvoices.map(inv => 
      `ID: ${inv.id} | Number: ${inv.number} | Customer: ${inv.customer.legalName} | TotalDue: ${inv.grandTotal}`
    );

    // Fuzzy Logic Engine Prompt
    const systemPrompt = `You are a robotic Accounting Reconciliation Engine.
I am providing you with two datasets:
1. Outstanding Invoices: [${invoiceSummaries.join(", ")}]
2. A raw Bank Statement CSV string.

Your exact task is to attempt to match every CREDIT (money received) in the Bank Statement to exactly ONE Outstanding Invoice using 'fuzzy logic' matching on Names, Amounts, or Invoice Numbers found in the bank narrative.

Respond exactly in JSON format:
{
  "matches": [
    {
      "bankNarrative": "UPI-1234 ABC CORP",
      "matchedInvoiceId": "<id of invoice>",
      "confidenceScore": 95,
      "reason": "Amount and Customer Name matched."
    }
  ],
  "unmatchedCredits": ["Raw bank string 2"]
}`;

    const response = await openai.chat.completions.create({
      model: "meta/llama-3.1-70b-instruct", // High reasoning model for text pattern recognition
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the bank CSV: \n${csvData}` }
      ],
      max_tokens: 1500,
      temperature: 0,
      response_format: { type: "text" }, 
    });

    const rawMatchText = response.choices[0]?.message?.content || "{}";
    const cleanedText = rawMatchText.replace(/```json/g, "").replace(/```/g, "").trim();
    const mappings = JSON.parse(cleanedText);

    return NextResponse.json({ data: mappings });

  } catch (error: any) {
    console.error("Fuzzy Reconciliation Failed:", error);
    return NextResponse.json({ error: "Failed to map bank records via AI." }, { status: 500 });
  }
}
