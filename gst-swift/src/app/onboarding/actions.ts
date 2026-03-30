"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function setupSaaSTenant(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized Access Sequence. Identity missing.");

  // Check if they spoofed the UI
  const existingMember = await db.organizationMember.findFirst({ where: { userId } });
  if (existingMember) throw new Error("Tenant Identity already provisioned. Proceed to /dashboard.");

  const companyName = formData.get("companyName") as string;
  const gstin = formData.get("gstin") as string || null;

  if (!companyName) throw new Error("Company Legal Identifier is strictly required for SaaS compilation.");

  // Execute an atomic multi-table write deploying the Zero-Touch infrastructure
  await db.$transaction(async (tx) => {
    // 1. Compile the Root Organization Matrix
    const org = await tx.organization.create({
      data: {
        name: companyName,
        tradeName: companyName,
        gstin: gstin || undefined,
        baseCurrency: "INR",
      }
    });

    // 2. Hydrate the initial Organization Member (The Architect / OWNER)
    await tx.organizationMember.create({
      data: {
        userId,
        orgId: org.id,
        role: "OWNER",
      }
    });

    // 3. Compile the HQ Data Center (Default Branch)
    await tx.branch.create({
      data: {
        orgId: org.id,
        name: `${companyName} Base Station HQ`,
        address: "HQ Address Provided Separately",
        state: "MH", // Defaulted generic
        pincode: "400001",
        isHead: true,
      }
    });

    // 4. Seed the explicit Freemium Quotas
    await tx.tenantSettings.create({
      data: {
        orgId: org.id,
        subscriptionTier: "FREE",
        aiOcrTokensRemaining: 10,
        inventoryReorderThreshold: 5.0,
        enableAutomatedPOEmails: false,
      }
    });
  });

  return { success: true };
}
