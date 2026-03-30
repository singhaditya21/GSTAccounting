import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { db } from "@/lib/db";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy_secret",
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    
    // Validate Invoice
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { customer: true, organization: true }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status === "PAID") return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });

    // If a link already exists and isn't expired, return it to prevent duplicate charges
    if (invoice.razorpayPaymentLinkId) {
      return NextResponse.json({ paymentLink: invoice.razorpayPaymentLinkId });
    }

    // Amount must be in paisa/cents
    // E.g., 1000.50 INR -> 100050 paisa
    const amountInPaisa = Math.round(invoice.grandTotal * 100);

    // Create Razorpay Payment Link
    const paymentLinkRequest = {
      amount: amountInPaisa,
      currency: invoice.currency,
      accept_partial: false,
      description: `Payment for Invoice #${invoice.number}`,
      customer: {
        name: invoice.customer.legalName,
        email: "customer@example.com", // Stub: in a real app, customer has email
        contact: "+919999999999" // Stub
      },
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: false,
      notes: {
        invoice_id: invoice.id,
        org_id: invoice.orgId
      }
    };

    const paymentLink = await razorpay.paymentLink.create(paymentLinkRequest);

    // Save linkage strictly to DB
    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        razorpayOrderId: paymentLink.order_id,
        razorpayPaymentLinkId: paymentLink.short_url,
        razorpayStatus: paymentLink.status
      }
    });

    return NextResponse.json({ paymentLink: paymentLink.short_url });
  } catch (error: any) {
    console.error("Razorpay Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
