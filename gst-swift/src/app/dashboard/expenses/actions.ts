"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get User's Organization and Head Branch
  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: {
        include: { branches: { where: { isHead: true } } }
      }
    }
  });

  if (!member) throw new Error("No organization found");
  
  const headBranch = member.organization.branches[0];
  if (!headBranch) throw new Error("No head branch configured for this organization");

  const description = formData.get("description") as string;
  const amountStr = formData.get("amount") as string;
  const taxAmountStr = formData.get("taxAmount") as string;
  const dateStr = formData.get("date") as string;
  const isReverseCharge = formData.get("isReverseCharge") === "on";
  const isEligibleITC = formData.get("isEligibleITC") === "on";

  const amount = parseFloat(amountStr || "0");
  const taxAmount = parseFloat(taxAmountStr || "0");
  const date = dateStr ? new Date(dateStr) : new Date();

  // 1. Create the base Expense Record
  const expense = await db.expense.create({
    data: {
      orgId: member.orgId,
      branchId: headBranch.id,
      description,
      amount,
      taxAmount,
      date,
      isReverseCharge,
      isEligibleITC,
    },
  });

  // 2. Atomic Ledger Update (Double Entry)
  await db.$transaction(async (tx) => {
    // Credit Cash/Bank (Total Outflow)
    await tx.ledgerEntry.create({
      data: {
        orgId: member.orgId,
        date: new Date(),
        account: "BANK_OUTFLOW",
        type: "CREDIT",
        amount: amount + taxAmount,
        description: `Payment for ${description}`,
        referenceId: expense.id,
      }
    });

    // Debit Expense Account (Taxable Value)
    await tx.ledgerEntry.create({
      data: {
        orgId: member.orgId,
        date: new Date(),
        account: "DIRECT_EXPENSES",
        type: "DEBIT",
        amount: amount,
        description: description,
        referenceId: expense.id,
      }
    });

    // Debit Input Tax if eligible
    if (taxAmount > 0 && isEligibleITC && !isReverseCharge) {
      await tx.ledgerEntry.create({
        data: {
          orgId: member.orgId,
          date: new Date(),
          account: "INPUT_TAX_CREDIT",
          type: "DEBIT",
          amount: taxAmount,
          description: `Input Tax for ${description}`,
          referenceId: expense.id,
        }
      });
    }
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/accounting");
}

export async function createExpenseFromOcr(data: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: {
        include: { branches: { where: { isHead: true } } }
      }
    }
  });

  if (!member || !member.organization.branches[0]) throw new Error("No branch configured");

  const headBranch = member.organization.branches[0];

  const amount = parseFloat(data.amount || "0");
  const taxAmount = parseFloat(data.taxAmount || "0");
  const date = data.date ? new Date(data.date) : new Date();

  const expense = await db.expense.create({
    data: {
      orgId: member.orgId,
      branchId: headBranch.id,
      description: data.description || "AI Extracted OCR Expense",
      amount,
      taxAmount,
      date,
      isReverseCharge: false,
      isEligibleITC: true,
    },
  });

  await db.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        orgId: member.orgId,
        date: new Date(),
        account: "BANK_OUTFLOW",
        type: "CREDIT",
        amount: amount + taxAmount,
        description: `Payment for AI OCR Expense`,
        referenceId: expense.id,
      }
    });

    await tx.ledgerEntry.create({
      data: {
        orgId: member.orgId,
        date: new Date(),
        account: "DIRECT_EXPENSES",
        type: "DEBIT",
        amount: amount,
        description: data.description || "AI Extracted OCR",
        referenceId: expense.id,
      }
    });

    if (taxAmount > 0) {
      await tx.ledgerEntry.create({
        data: {
          orgId: member.orgId,
          date: new Date(),
          account: "INPUT_TAX_CREDIT",
          type: "DEBIT",
          amount: taxAmount,
          description: `Input Tax OCR`,
          referenceId: expense.id,
        }
      });
    }
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/accounting");
}
