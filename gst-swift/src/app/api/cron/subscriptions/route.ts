import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// CRON execution endpoint, validated by a bearer token from Vercel/AWS CloudWatch
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized Execution" }, { status: 401 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const subscriptionsDue = await db.subscription.findMany({
      where: {
        isActive: true,
        nextBillingDate: { lte: startOfToday }
      },
      include: { customer: true, organization: true }
    });

    const executionLog = [];

    for (const sub of subscriptionsDue) {
      // 1. Generate the recursive invoice
      const parsedItems = JSON.parse(sub.structuredItems);
      let grandTotal = 0;
      let taxableTotal = 0;

      const itemsPayload = parsedItems.map((it: any) => {
        taxableTotal += it.taxableValue;
        grandTotal += it.totalAmount;
        return {
          productId: it.productId,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxableValue: it.taxableValue,
          igstAmount: it.igstAmount || 0,
          cgstAmount: it.cgstAmount || 0,
          sgstAmount: it.sgstAmount || 0,
          totalAmount: it.totalAmount
        };
      });

      const randomInvoiceSegment = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `REC-${new Date().getFullYear()}-${randomInvoiceSegment}`;

      const newInvoice = await db.invoice.create({
        data: {
          orgId: sub.orgId,
          branchId: sub.branchId,
          customerId: sub.customerId,
          number: invoiceNumber,
          currency: sub.currency,
          date: new Date(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
          status: "ISSUED",
          placeOfSupply: sub.customer.billingState,
          taxableValue: taxableTotal,
          grandTotal: grandTotal,
          items: {
            create: itemsPayload
          }
        }
      });

      // 2. Set next billing date recursively
      let nextDate = new Date();
      if (sub.interval === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (sub.interval === "ANNUALLY") nextDate.setFullYear(nextDate.getFullYear() + 1);

      await db.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate: nextDate }
      });

      executionLog.push(`Cloned Invoice ${invoiceNumber} for Sub [${sub.id}] -> Customer [${sub.customer.legalName}]`);
    }

    return NextResponse.json({ status: "success", generated: executionLog });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
