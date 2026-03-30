"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createTeamInvite(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId }
  });

  if (!member || member.role !== "OWNER") {
    throw new Error("Only the SaaS Tenant Owner can distribute Provisioning hashes.");
  }

  const email = formData.get("email") as string;
  const roleName = formData.get("roleName") as string;

  if (!email || !roleName) throw new Error("Missing parameters.");

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await db.pendingInvite.create({
    data: {
      orgId: member.orgId,
      email,
      roleName,
      token,
      expiresAt
    }
  });

  // In production, physically trigger Resend/SendGrid API here!
  // console.log(`DISPATCHED MAGIC LINK TO ${email}`);

  revalidatePath("/dashboard/settings/team");
}

export async function deleteInvite(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({ where: { userId } });
  if (!member || member.role !== "OWNER") throw new Error("Unauthorized");

  await db.pendingInvite.delete({
    where: { id, orgId: member.orgId } // Scoped explicitly to Tenant
  });

  revalidatePath("/dashboard/settings/team");
}
