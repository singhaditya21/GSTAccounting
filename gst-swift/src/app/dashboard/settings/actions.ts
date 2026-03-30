"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateTenantSettings(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: { include: { tenantSettings: true } } }
  });

  if (!member || member.role !== "OWNER") {
    throw new Error("Only the Organization OWNER can mutate Global SaaS policies.");
  }

  const settingsId = member.organization.tenantSettings?.id;
  if (!settingsId) throw new Error("Settings not instantiated.");

  const inventoryReorderThreshold = parseFloat(formData.get("inventoryReorderThreshold") as string);
  const enableAutomatedPOEmails = formData.get("enableAutomatedPOEmails") === "on";
  const procurementEmail = formData.get("procurementEmail") as string || null;
  const idleTimeoutMinutes = parseInt(formData.get("idleTimeoutMinutes") as string) || 30;

  // Enforce Max Bounds at Server level mathematically
  let platformOpts = await db.platformSettings.findUnique({ where: { id: "GLOBAL" } });
  if (platformOpts && idleTimeoutMinutes > platformOpts.maxIdleTimeoutMinutes) {
     throw new Error(`SaaS Firewall violation: Idle timeout cannot exceed ${platformOpts.maxIdleTimeoutMinutes} minutes.`);
  }

  await db.tenantSettings.update({
    where: { id: settingsId },
    data: {
      inventoryReorderThreshold: isNaN(inventoryReorderThreshold) ? 5 : inventoryReorderThreshold,
      enableAutomatedPOEmails,
      procurementEmail,
      idleTimeoutMinutes,
    }
  });

  revalidatePath("/dashboard/settings");
}
