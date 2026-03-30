"use client";

import { useTransition, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { createTeamInvite } from "./actions";

export function InviteForm({ rolePolicies }: { rolePolicies: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createTeamInvite(formData);
        // Refresh handled by server action revalidate
        window.location.reload(); 
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  return (
    <Card className="border-emerald-600/20 shadow-lg shadow-emerald-600/5">
      <form action={onSubmit}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-500" /> Dispatch Invite</CardTitle>
          <CardDescription>
            Target an Email Address and bind a Custom Role Matrix dynamically restricting their Data bounds.
            {errorObj && <div className="text-red-500 font-bold mt-2">{errorObj}</div>}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Target Employee Email</Label>
            <Input name="email" type="email" required placeholder="coworker@b2b-company.com" />
            <p className="text-[10px] text-zinc-500">The destination address receiving your Magic URL.</p>
          </div>

          <div className="space-y-2">
            <Label>Bind Identity Policy</Label>
            <div className="flex gap-2 w-full">
              <Select name="roleName" required defaultValue={rolePolicies[0]?.roleName || "ACCOUNTANT"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Custom Matrix" />
                </SelectTrigger>
                <SelectContent>
                  {/* Default Fallback Modes */}
                  <SelectItem value="ACCOUNTANT">Fundamental Accountant Fallback</SelectItem>
                  <SelectItem value="VIEWER">Strict Read-Only Fallback</SelectItem>
                  
                  {/* Dynamic Custom Tenant Policies */}
                  {rolePolicies.map((p) => (
                    <SelectItem key={p.id} value={p.roleName} className="font-bold text-emerald-700">
                      SaaS CUSTOM: {p.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-zinc-50 dark:bg-zinc-900/30 border-t pt-4">
          <Button disabled={isPending} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Compile Magic URL
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
