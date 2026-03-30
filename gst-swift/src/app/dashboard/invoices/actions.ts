"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Interface for Invoice Items passed from client
type InvoiceItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export async function createInvoice(formData: FormData, items: InvoiceItemInput[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: { include: { branches: true } } },
  });

  if (!member) throw new Error("No organization found");

  const orgId = member.orgId;
  const customerId = formData.get("customerId") as string;
  // Fallback to first branch if not explicitly provided
  const branchId = formData.get("branchId") as string || member.organization.branches[0].id;
  const dueDate = formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined;

  // 1. Fetch Customer and Branch to determine PoS
  const [customer, branch] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId } }),
    db.branch.findUnique({ where: { id: branchId } }),
  ]);

  if (!customer || !branch) throw new Error("Invalid customer or branch selection");

  const isInterState = customer.billingState.toUpperCase() !== branch.state.toUpperCase();
  const placeOfSupply = customer.billingState.toUpperCase();

  // 2. Fetch Products to auto-calculate taxes
  const productIds = items.map(i => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(products.map(p => [p.id, p]));

  // 3. Tax Calculation Engine
  let totalTaxableValue = 0;
  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalDiscount = 0;

  const invoiceItemsCalculated = items.map(item => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);

    const grossAmount = item.quantity * item.unitPrice;
    const taxableValue = grossAmount - item.discount;
    totalDiscount += item.discount;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const taxAmount = (taxableValue * product.gstRate) / 100;

    if (isInterState) {
      igstAmount = taxAmount;
    } else {
      cgstAmount = taxAmount / 2;
      sgstAmount = taxAmount / 2;
    }

    const totalAmount = taxableValue + igstAmount + cgstAmount + sgstAmount;

    totalTaxableValue += taxableValue;
    totalIgst += igstAmount;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;

    return {
      productId: item.productId,
      description: product.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxableValue,
      igstAmount,
      cgstAmount,
      sgstAmount,
      totalAmount,
    };
  });

  const grandTotal = totalTaxableValue + totalIgst + totalCgst + totalSgst;

  // 4. Sequential Invoice Numbering
  // Fetch count of invoices for this branch in the current FY
  const fyYear = new Date().getFullYear();
  const count = await db.invoice.count({
    where: { branchId, createdAt: { gte: new Date(`${fyYear}-04-01`) } }
  });
  
  const formattedCount = String(count + 1).padStart(4, '0');
  const orgPrefix = member.organization.name.substring(0, 3).toUpperCase();
  const branchPrefix = branch.isHead ? "HQ" : "BR";
  const sequentialNumber = `${orgPrefix}-${branchPrefix}-${fyYear}-${formattedCount}`;

  // 5. Database Transaction: Create Invoice + Ledger Entries
  await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        orgId,
        branchId,
        customerId,
        number: sequentialNumber,
        currency: customer.defaultCurrency, // Deeply maps Party localization
        dueDate,
        status: "ISSUED",
        taxableValue: totalTaxableValue,
        igstAmount: totalIgst,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        discountTotal: totalDiscount,
        grandTotal,
        placeOfSupply,
        items: {
          create: invoiceItemsCalculated,
        }
      }
    });

    // Accounting: Double Entry
    // Debit Accounts Receivable
    await tx.ledgerEntry.create({
      data: {
        orgId, account: "ACCOUNTS_RECEIVABLE", type: "DEBIT", amount: grandTotal, referenceId: invoice.id
      }
    });

    // Credit Sales Revenue
    await tx.ledgerEntry.create({
      data: {
        orgId, account: "SALES_REVENUE", type: "CREDIT", amount: totalTaxableValue, referenceId: invoice.id
      }
    });

    // Credit Taxes
    if (isInterState) {
      await tx.ledgerEntry.create({
        data: { orgId, account: "OUTPUT_IGST", type: "CREDIT", amount: totalIgst, referenceId: invoice.id }
      });
    } else {
      await tx.ledgerEntry.create({
        data: { orgId, account: "OUTPUT_CGST", type: "CREDIT", amount: totalCgst, referenceId: invoice.id }
      });
      await tx.ledgerEntry.create({
        data: { orgId, account: "OUTPUT_SGST", type: "CREDIT", amount: totalSgst, referenceId: invoice.id }
      });
    }
  });

  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: { include: { rolePolicies: true } } }
  });

  if (!member) throw new Error("No organization found");

  // Advanced SaaS Custom RBAC Check: Fetch their specific policy!
  const policy = member.organization.rolePolicies.find(p => p.roleName === member.role);
  if (member.role !== "OWNER") {
    if (!policy || !policy.permissions.includes("INVOICE_DELETE")) {
      throw new Error("SaaS Security Lock: Your assigned role policy explicitly forbids deleting Tax Invoices.");
    }
  }

  // Ensure Invoice belongs to this org
  const invoice = await db.invoice.findFirst({
    where: { id, orgId: member.orgId }
  });

  if (!invoice) throw new Error("Invoice not found or unauthorized");

  if (invoice.status === "PAID") {
    throw new Error("Cannot delete a PAID invoice. Revert the payment ledger first.");
  }

  // Delete cascade handles items. But we must manually delete Ledger Entries.
  await db.$transaction(async (tx) => {
    // Delete all Double-Entry Ledgers tied to this Invoice
    await tx.ledgerEntry.deleteMany({
      where: { referenceId: id }
    });

    // Delete Invoice
    await tx.invoice.delete({
      where: { id }
    });
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/accounting");
}
