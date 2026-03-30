import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Factory, Fingerprint, LogIn } from "lucide-react";
import { claimInvite } from "./actions";

export default async function InviteClaimPage({ params }: { params: { token: string } }) {
  const { userId } = await auth();
  const user = await currentUser();

  // Validate Cryptographic Hash
  const invite = await db.pendingInvite.findUnique({
    where: { token: params.token },
    include: { organization: true }
  });

  if (!invite) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="text-center w-full max-w-sm border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-600">Invalid Matrix Token</CardTitle>
            <CardDescription>This provisioning hash has expired or does not exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (new Date() > invite.expiresAt) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="text-center w-full max-w-sm border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-600">Token Expired</CardTitle>
            <CardDescription>Security Protocol: Provisioning hashes self-destruct after 24 hours.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Pre-Authentication Firewall
  if (!userId || !user) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <Card className="max-w-md w-full shadow-2xl relative overflow-hidden text-center border-indigo-200 dark:border-indigo-900/50">
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-full flex justify-center items-center mb-4">
               <Fingerprint className="w-6 h-6 text-zinc-600" />
            </div>
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              You have been formally invited to join <strong>{invite.organization.name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              Please Log In or Sign Up using the targeted email address: <br/>
              <strong className="font-mono text-indigo-600 dark:text-indigo-400 block mt-2">{invite.email}</strong>
            </p>
          </CardContent>
          <CardFooter>
            <a href={`/sign-up?email_address=${encodeURIComponent(invite.email)}`} className="w-full">
              <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700">
                <LogIn className="w-4 h-4 mr-2" />
                Authenticate to Claim Access
              </Button>
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Active Authenticated Verification
  const userEmail = user.emailAddresses[0]?.emailAddress;
  if (userEmail?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
        <div className="flex h-screen items-center justify-center p-4">
          <Card className="text-center w-full max-w-md border-rose-200">
            <CardHeader>
              <CardTitle className="text-rose-600">Identity Mismatch</CardTitle>
              <CardDescription>
                This token is strictly encrypted for <strong>{invite.email}</strong>. 
                You are currently authenticated as <strong>{userEmail}</strong>.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
  }

  // Check if they spoofed multi-claiming
  const existingMember = await db.organizationMember.findFirst({ where: { userId } });
  if (existingMember) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="max-w-md w-full shadow-2xl border-emerald-100 dark:border-emerald-900/50 text-center">
        <CardHeader className="pb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
            <Factory className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-black">{invite.organization.name}</CardTitle>
          <CardDescription className="pt-2">
            The Organization Owner has designated you as <Badge variant="outline" className="ml-1 px-1 py-0">{invite.roleName}</Badge>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-left">
           <div className="flex gap-3 items-center text-sm p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Identity mapping verified for {userEmail}</span>
           </div>
        </CardContent>

        <CardFooter className="pt-4">
          <form action={async () => { "use server"; await claimInvite(params.token); }} className="w-full">
            <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-bold shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
               Accept Organization Matrix -&gt;
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
