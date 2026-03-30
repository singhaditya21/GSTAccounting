"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
  });

  if (!member) throw new Error("No organization found");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const hsnSac = formData.get("hsnSac") as string;
  const unit = formData.get("unit") as string;
  const gstRate = parseFloat(formData.get("gstRate") as string);
  const defaultPrice = parseFloat(formData.get("defaultPrice") as string);
  const isService = formData.get("isService") === "on";

  await db.product.create({
    data: {
      orgId: member.orgId,
      name,
      description,
      hsnSac,
      unit: unit.toUpperCase(),
      gstRate,
      defaultPrice,
      isService,
    },
  });

  revalidatePath("/dashboard/products");
}
