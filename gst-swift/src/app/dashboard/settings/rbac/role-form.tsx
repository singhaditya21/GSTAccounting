"use client";

import { useTransition, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, ShieldAlert } from "lucide-react";
import { createRolePolicy } from "./actions";

export function RoleForm() {
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createRolePolicy(formData);
        window.location.reload();
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  return (
    <Card className="border-indigo-600/20 shadow-lg shadow-indigo-600/5">
      <form action={onSubmit}>
        <CardHeader>
          <CardTitle className="text-xl">Construct Policy</CardTitle>
          <CardDescription>
            Map a Custom Role Name and meticulously check its computational privileges.
            {errorObj && <div className="text-red-500 font-bold mt-2">{errorObj}</div>}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Custom Role Identifier</Label>
            <Input name="roleName" required placeholder="JUNIOR_ACCOUNTANT" className="uppercase font-mono" />
            <p className="text-[10px] text-zinc-500 uppercase">Input the exact role name to link.</p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold tracking-tight uppercase text-zinc-500">Privilege Vectors</h4>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Read Invoices</Label>
              <Switch name="perm_invoice_read" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Generate Invoices</Label>
              <Switch name="perm_invoice_create" defaultChecked />
            </div>

            <div className="flex items-center gap-4 justify-between bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <Label className="text-sm font-bold text-rose-700 dark:text-rose-400">Delete Invoices</Label>
              </div>
              <Switch name="perm_invoice_delete" />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Read Ledgers</Label>
              <Switch name="perm_ledger_read" />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Mutate Inventory</Label>
              <Switch name="perm_inventory_mutate" />
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-zinc-50 dark:bg-zinc-900/30 border-t pt-4">
          <Button disabled={isPending} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Provision Security Node
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
