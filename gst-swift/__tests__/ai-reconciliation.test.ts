import { expect, test, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/reconcile/route';
import { db } from '@/lib/db';
import OpenAI from 'openai';

// 1. Mock DB
vi.mock('@/lib/db', () => ({
  db: {
    invoice: { findMany: vi.fn() }
  }
}));

// 2. Deep Mock OpenAI and its class instantiations
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn()
}));

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mockCreate
        }
      }
    }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('POST /api/reconcile: Validates AI Fuzzy Matching on Bank State CSVs', async () => {
  // Simulate 3 Unpaid Invoices sitting in our database
  (db.invoice.findMany as any).mockResolvedValue([
    { id: "1", number: "INV-101", grandTotal: 5000, customer: { legalName: "ABC Corp" } },
    { id: "2", number: "INV-102", grandTotal: 10000, customer: { legalName: "XYZ Tech" } }
  ]);

  // Mock the CSV coming from the client
  const req = new Request('http://localhost:3000/api/reconcile', {
    method: 'POST',
    body: JSON.stringify({
      csvData: "Date,Narration,Withdrawal,Deposit\n01/01/26,NEFT-ABC-CORP-PAYMENT,0,5000",
      orgId: "org-123"
    })
  });

  // Intercept the NVIDIA API call securely returning our mocked fuzzy-logic evaluation
  mockCreate.mockResolvedValue({
    choices: [{
      message: {
        content: `\`\`\`json
{
  "matches": [
    {
      "bankNarrative": "NEFT-ABC-CORP-PAYMENT",
      "matchedInvoiceId": "1",
      "confidenceScore": 99,
      "reason": "Name and exact Amount of 5000 aligned."
    }
  ],
  "unmatchedCredits": []
}
\`\`\``
      }
    }]
  });

  const response = await POST(req);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.data.matches).toHaveLength(1);
  expect(data.data.matches[0].confidenceScore).toBe(99);
  expect(data.data.matches[0].matchedInvoiceId).toBe("1");

  // Prove the AI LLM route invoked the high-compute model securely
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      model: "meta/llama-3.1-70b-instruct",
      temperature: 0, 
    })
  );
});
