"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createCustomer(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get User's Organization
  const member = await db.organizationMember.findFirst({
    where: { userId },
  });

  if (!member) throw new Error("No organization found");

  const legalName = formData.get("legalName") as string;
  const p_gstin = formData.get("gstin") as string;
  const gstin = p_gstin ? p_gstin.toUpperCase() : null;
  const p_pan = formData.get("pan") as string;
  const pan = p_pan ? p_pan.toUpperCase() : null;
  
  const billingAddress = formData.get("billingAddress") as string;
  const billingState = formData.get("billingState") as string;
  const billingPincode = formData.get("billingPincode") as string;
  
  const defaultCurrency = (formData.get("defaultCurrency") as string) || "INR";
  const preferredLanguage = (formData.get("preferredLanguage") as string) || "en";

  await db.customer.create({
    data: {
      orgId: member.orgId,
      legalName,
      gstin,
      pan,
      billingAddress,
      billingState,
      billingPincode,
      defaultCurrency,
      preferredLanguage,
    },
  });

  revalidatePath("/dashboard/customers");
}
