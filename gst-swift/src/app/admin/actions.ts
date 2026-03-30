"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function requireRootIdentity() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase() || "";
  const adminEmailsList = (process.env.PLATFORM_ADMIN_EMAILS || "singhaditya21@gmail.com").toLowerCase().split(",");
  
  if (!adminEmailsList.includes(email)) {
    throw new Error("SEC-VIO-503: Unlawful Access Attempt intercepted continuously.");
  }
}

export async function forceSaaSTierUpdate(orgId: string, subscriptionTier: string, aiTokens: number) {
  // 1. Defend Boundary
  await requireRootIdentity();

  // 2. Perform Native Mutation globally stripped of standard role hierarchies
  const settings = await db.tenantSettings.findFirst({ where: { orgId } });

  if (!settings) {
    throw new Error("Orphaned Organization -> No settings node found");
  }

  await db.tenantSettings.update({
    where: { id: settings.id },
    data: {
      subscriptionTier,
      aiOcrTokensRemaining: aiTokens
    }
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateGlobalPlatformSettings(maxIdleTimeoutMinutes: number) {
  // 1. Defend Boundary
  await requireRootIdentity();

  // 2. Mutate Global Node
  await db.platformSettings.upsert({
     where: { id: "GLOBAL" },
     update: { maxIdleTimeoutMinutes },
     create: { id: "GLOBAL", maxIdleTimeoutMinutes }
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/settings");
  return { success: true };
}
