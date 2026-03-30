"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateGstr1Json } from "@/lib/gstr-generator";

export async function downloadGstr1(month: number, year: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
  });

  if (!member) throw new Error("Organization not found");

  const gstrJson = await generateGstr1Json(member.orgId, month, year);
  
  // Return the pure JSON serializable object
  return gstrJson;
}
