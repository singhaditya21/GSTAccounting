"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { stringSimilarity } from "string-similarity-js";

export async function matchBankStatement(csvText: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
  });
  if (!member) throw new Error("Org not found");

  // Fetch all pending B2B Invoices (that have actual GSTINs) to act as possible matches
  const openInvoices = await db.invoice.findMany({
    where: { orgId: member.orgId, status: "ISSUED" },
    include: { customer: true }
  });

  const lines = csvText.split("\n").filter(l => l.trim().length > 10);
  const matched = [];

  for (const line of lines) {
    let bestMatch = null;
    let highestScore = 0;

    for (const inv of openInvoices) {
      // Very basic Vector/Levenshtein simulation against the exact line string
      const nameScore = stringSimilarity(line.toLowerCase(), inv.customer.legalName.toLowerCase());
      // Boost score drastically if the exact invoice amount exists in the string or invoice number
      const amountStr = inv.grandTotal.toString();
      const numStr = inv.number.split("-").pop() || "";
      
      let finalScore = nameScore;
      if (line.includes(amountStr)) finalScore += 0.4;
      if (line.includes(numStr)) finalScore += 0.5;

      if (finalScore > highestScore) {
        highestScore = finalScore;
        bestMatch = inv;
      }
    }

    if (bestMatch && highestScore > 0.45) {
      matched.push({
        transactionRaw: line.substring(0, 60),
        invoiceNumber: bestMatch.number,
        customerName: bestMatch.customer.legalName,
        expectedAmount: bestMatch.grandTotal,
        confidence: Math.round((Math.min(highestScore, 1)) * 100)
      });
    } else {
        matched.push({
            transactionRaw: line.substring(0, 60),
            invoiceNumber: "UNMATCHED",
            customerName: "-",
            expectedAmount: "-",
            confidence: 0
        });
    }
  }

  return matched;
}
