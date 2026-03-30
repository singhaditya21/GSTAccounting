import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    // Check if the user is attached to any organization
    const member = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (member) {
      redirect("/dashboard");
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center flex-col gap-6 bg-zinc-950 text-white">
      <h1 className="text-4xl font-bold tracking-tight">GSTSwift</h1>
      <p className="text-lg text-zinc-400">100% GST-Compliant Invoicing & Accounting</p>
      <a href="/sign-in" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium">
        Get Started
      </a>
    </div>
  );
}
