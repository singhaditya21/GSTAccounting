import { db } from "@/lib/db";
import { InvoiceForm } from "./invoice-form";
import { createInvoice } from "../actions";
import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function NewInvoicePage() {
  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER", "ACCOUNTANT", "BRANCH_MANAGER"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  const [customers, products, branches] = await Promise.all([
    db.customer.findMany({ where: { orgId: member.orgId } }),
    db.product.findMany({ where: { orgId: member.orgId } }),
    db.branch.findMany({ where: { orgId: member.orgId } })
  ]);

  const action = async (formData: FormData) => {
    "use server";
    const itemsData = formData.get("itemsData") as string;
    const items = JSON.parse(itemsData);
    await createInvoice(formData, items);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
        <p className="text-zinc-500">Generate a pristine B2B/B2C GST-Compliant Tax Invoice</p>
      </div>

      <div className="border rounded-md bg-white dark:bg-zinc-950 px-6 py-6 shadow-sm">
        <form action={action}>
          <InvoiceForm customers={customers} products={products} branches={branches} />
        </form>
      </div>
    </div>
  );
}
