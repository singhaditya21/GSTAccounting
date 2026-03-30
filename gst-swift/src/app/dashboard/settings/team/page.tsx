import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Trash2, Users } from "lucide-react";
import { InviteForm } from "./invite-form";
import { deleteInvite } from "./actions";
import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function TeamSettingsPage() {
  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  const orgData = await db.organization.findUnique({
    where: { id: member.orgId },
    include: { pendingInvites: true, rolePolicies: true, members: true }
  });

  if (!orgData) return null;
  const { pendingInvites, members, rolePolicies } = orgData;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Provisioning</h1>
        <p className="text-zinc-500">Dispatch cryptographically mapped access URLs linking external employees into the Core Engine.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> Active Organization Members</CardTitle>
              <CardDescription>Network nodes actively operating within the Tenant boundaries.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
                    <div>
                      <p className="font-mono text-sm tracking-tighter">{m.userId.substring(0, 15)}...</p>
                      <p className="text-xs text-zinc-500">Node Connected: {m.createdAt.toLocaleDateString()}</p>
                    </div>
                    <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>{m.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-amber-500" /> Pending Provisioning Tasks</CardTitle>
              <CardDescription>Generated Invite UUID hashes awaiting employee claim activation.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingInvites.length === 0 ? (
                <div className="text-center p-6 border border-dashed rounded-lg text-sm text-zinc-500">
                  No outgoing invitations currently dangling.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold tracking-tight">{invite.email}</p>
                          <p className="text-xs text-zinc-500">Identity Target</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-white dark:bg-zinc-950 border-amber-300">
                          {invite.roleName}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 border-t border-amber-200/50 dark:border-amber-800/50 pt-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Magic URL Payload</p>
                          <code className="text-[10px] bg-white dark:bg-black px-2 py-1 rounded text-amber-600 block max-w-xs truncate">
                            {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000"}/invite/{invite.token}
                          </code>
                        </div>
                        <form action={async () => { "use server"; await deleteInvite(invite.id); }}>
                          <Button variant="ghost" size="sm" type="submit" className="text-rose-500 h-7 w-7 p-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <InviteForm rolePolicies={rolePolicies} />
        </div>
      </div>
    </div>
  );
}
