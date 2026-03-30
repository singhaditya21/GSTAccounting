import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "dummy-dev-secret-123";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const payloadRaw = await req.text();
    const payload = JSON.parse(payloadRaw);

    // Cryptographic verification
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(payloadRaw)
      .digest("hex");

    if (expectedSignature !== signature) {
      // Intentionally silent failure for security/malicious scans, but logs internally
      console.warn("Invalid Razorpay Hook Signature Attempt Detected.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const event = payload.event;
    if (event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;
      const amountCaptured = paymentEntity.amount / 100; // Razorpay uses paisa
      const rzpPaymentId = paymentEntity.id;

      // Find tracking invoice
      const invoice = await db.invoice.findFirst({
        where: { razorpayOrderId: rzpOrderId }
      });

      if (!invoice) {
        return NextResponse.json({ error: "Invoice linking failed" }, { status: 404 });
      }

      // Ledger Transaction (ACID)
      await db.$transaction(async (tx) => {
        // 1. Mark Invoice Status
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID" }
        });

        // 2. Create local Payment record
        await tx.payment.create({
          data: {
            orgId: invoice.orgId,
            invoiceId: invoice.id,
            amount: amountCaptured,
            paymentMode: "RAZORPAY",
            currency: invoice.currency,
            razorpayPaymentId: rzpPaymentId,
            razorpaySignature: signature,
          }
        });

        // 3. Double-Entry Accounting
        // Debit the Bank (Assets go up)
        await tx.ledgerEntry.create({
          data: {
            orgId: invoice.orgId,
            date: new Date(),
            account: "BANK",
            type: "DEBIT",
            currency: invoice.currency,
            amount: amountCaptured * invoice.exchangeRate, 
            description: `Razorpay Auto-Settlement [${rzpPaymentId}]`
          }
        });
        
        // Credit Accounts Receivable (Asset goes down)
        await tx.ledgerEntry.create({
          data: {
            orgId: invoice.orgId,
            date: new Date(),
            account: "ACCOUNTS_RECEIVABLE",
            type: "CREDIT",
            currency: invoice.currency,
            amount: amountCaptured * invoice.exchangeRate,
            description: `Payment applied for Invoice ${invoice.number}`
          }
        });
      });

      return NextResponse.json({ status: "success", reconciled: true });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error: any) {
    console.error("Webhook processing error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
