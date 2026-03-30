import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET as string)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Cryptographic hash spoof detected. Transaction rejected." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Filter strictly for SaaS Upgrades (Decoupled from generic Client Invoices)
    if (event.event === "payment.captured") {
      try {
        const notes = event.payload.payment.entity.notes;

        // Extract metadata explicitly mapped via our /saas-order/route.ts
        if (notes && notes.type === "SAAS_UPGRADE") {
          const orgId = notes.orgId;
          const newTier = notes.tier; // "PRO" or "ENTERPRISE"
          
          if (!orgId || !newTier) throw new Error("Crucial SaaS Mutation Parameters missing from Razorpay Context.");

          // Perform the Atomic Zero-Touch Subscription Mutation
          const settings = await db.tenantSettings.findFirst({ where: { orgId } });
          
          if (settings) {
            await db.tenantSettings.update({
              where: { id: settings.id },
              data: {
                subscriptionTier: newTier,
                aiOcrTokensRemaining: 1000, 
              }
            });
            console.log(`[SaaS Billing] -> ${orgId} natively mutated to ${newTier} with 1000 Refreshed Tokens.`);
          } else {
             console.error(`[FATAL] Webhook processed but TenantSettings for ${orgId} strictly missing.`);
          }
        }
      } catch (innerError) {
         console.error("[SaaS Drift Attack] Malformed Razorpay Event Schema detected:", innerError);
      }
    }

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    console.error("Webhook processing strictly failed:", error);
    return NextResponse.json({ error: "Internal processing logic failure." }, { status: 500 });
  }
}
