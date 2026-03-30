"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createRolePolicy(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
  });

  if (!member || member.role !== "OWNER") {
    throw new Error("Only the Organization OWNER can create strict Role maps.");
  }

  const roleName = (formData.get("roleName") as string).toUpperCase().replace(/\s+/g, '_');
  
  // Extract all toggled permissions natively
  const permissions = [];
  if (formData.get("perm_invoice_read") === "on") permissions.push("INVOICE_READ");
  if (formData.get("perm_invoice_create") === "on") permissions.push("INVOICE_CREATE");
  if (formData.get("perm_invoice_delete") === "on") permissions.push("INVOICE_DELETE");
  if (formData.get("perm_ledger_read") === "on") permissions.push("LEDGER_READ");
  if (formData.get("perm_inventory_mutate") === "on") permissions.push("INVENTORY_MUTATE");

  await db.rolePolicy.upsert({
    where: { orgId_roleName: { orgId: member.orgId, roleName } },
    update: { permissions: JSON.stringify(permissions) },
    create: {
      orgId: member.orgId,
      roleName,
      permissions: JSON.stringify(permissions),
    }
  });

  revalidatePath("/dashboard/settings/rbac");
}

export async function deleteRolePolicy(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({ where: { userId } });
  if (!member || member.role !== "OWNER") throw new Error("Unauthorized");

  await db.rolePolicy.delete({
    where: { id, orgId: member.orgId } // Security scoping
  });

  revalidatePath("/dashboard/settings/rbac");
}
