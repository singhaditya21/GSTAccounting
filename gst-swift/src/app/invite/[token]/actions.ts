"use server";

import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function claimInvite(token: string) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) throw new Error("Authentication missing during claim.");

  const invite = await db.pendingInvite.findUnique({
    where: { token },
  });

  if (!invite) throw new Error("Fatal: Token exhausted or invalid.");
  if (new Date() > invite.expiresAt) throw new Error("Security Rejection: Token elapsed beyond 24-hour physical lifespan.");

  const userEmail = user.emailAddresses[0]?.emailAddress;
  if (userEmail?.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error("Identity injection blocked.");
  }

  // Atomic Execution: Mutate Member and burn the Token
  await db.$transaction(async (tx) => {
    // Inject user into explicit SaaS boundaries
    await tx.organizationMember.create({
      data: {
        userId,
        orgId: invite.orgId,
        role: invite.roleName,
      }
    });

    // Destroy the hash to prevent replay attacks!
    await tx.pendingInvite.delete({
      where: { id: invite.id }
    });
  });

  redirect("/dashboard");
}
