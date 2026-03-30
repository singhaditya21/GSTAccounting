import { expect, test, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhooks/razorpay/route';
import { db } from '@/lib/db';
import crypto from 'crypto';

vi.mock('@/lib/db', () => ({
  db: {
    invoice: { findFirst: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn() },
    ledgerEntry: { create: vi.fn() },
    $transaction: vi.fn((callback) => callback(db)), 
  }
}));

const DUMMY_SECRET = "dummy-dev-secret-123"; // Matches the route default

test('POST /api/webhooks/razorpay: Reject Invalid Signatures', async () => {
  const req = new Request('http://localhost:3000/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'x-razorpay-signature': 'hacker-signature-123' },
    body: JSON.stringify({ event: 'payment.captured' })
  });

  const res = await POST(req);
  expect(res.status).toBe(403);
});

test('POST /api/webhooks/razorpay: Legitimate Signed Webhook registers Double Entry Ledger', async () => {
  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_12345",
          order_id: "order_999",
          amount: 50000 // 500.00 INR
        }
      }
    }
  };

  const payloadString = JSON.stringify(payload);
  
  // Actually generate the identical mathematical HMAC standard Razorpay servers use
  const expectedSignature = crypto
      .createHmac("sha256", DUMMY_SECRET)
      .update(payloadString)
      .digest("hex");

  const req = new Request('http://localhost:3000/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'x-razorpay-signature': expectedSignature },
    body: payloadString
  });

  // Mock Invoice Query
  (db.invoice.findFirst as any).mockResolvedValue({
    id: "inv-rx",
    orgId: "org-1",
    currency: "INR",
    exchangeRate: 1.0,
    number: "INV-100"
  });

  const res = await POST(req);
  const data = await res.json();
  
  expect(res.status).toBe(200);
  expect(data.reconciled).toBe(true);
  
  // Ledger validations! Assert that Money literally moved from Asset to Bank natively securely.
  
  // 1. Mark Paid
  expect(db.invoice.update).toHaveBeenCalledWith({
    where: { id: "inv-rx" },
    data: { status: "PAID" }
  });

  // 2. Debit Matrix (Bank Goes UP by 500 equivalent base currency)
  expect(db.ledgerEntry.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ account: "BANK", type: "DEBIT", amount: 500 })
    })
  );

  // 3. Credit Matrix (Receivables Drops by 500)
  expect(db.ledgerEntry.create).toHaveBeenCalledWith(
     expect.objectContaining({
       data: expect.objectContaining({ account: "ACCOUNTS_RECEIVABLE", type: "CREDIT", amount: 500 })
     })
  );
});
