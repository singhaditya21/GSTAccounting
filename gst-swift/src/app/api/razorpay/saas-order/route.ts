import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: { include: { tenantSettings: true } } }
    });

    if (!member || member.role !== "OWNER") {
      return NextResponse.json({ error: "Only explicitly defined Tenant Owners can authorize Corporate SaaS Upgrades." }, { status: 403 });
    }

    const { plan } = await req.json();

    // Map strict mathematical pricing to the explicit SaaS Tiers
    let amountObj = 0;
    if (plan === "pro") amountObj = 999 * 100; // ₹999.00
    if (plan === "enterprise") amountObj = 1999 * 100;

    if (amountObj === 0) return NextResponse.json({ error: "Invalid SaaS Tier compilation." }, { status: 400 });

    const order = await razorpay.orders.create({
      amount: amountObj,
      currency: "INR",
      receipt: `saas_${member.orgId}_${Date.now()}`,
      notes: {
        type: "SAAS_UPGRADE",
        orgId: member.orgId,
        tier: plan.toUpperCase()
      }
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      orgId: member.orgId,
    });
  } catch (error) {
    console.error("Razorpay SaaS Hook compilation failed:", error);
    return NextResponse.json({ error: "Internal payment abstraction error." }, { status: 500 });
  }
}
