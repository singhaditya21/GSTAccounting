import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const member = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: true }
    });

    if (!member) return new NextResponse("Unauthorized Access", { status: 403 });

    // Ensure we are filtering strictly for their Tenant Organization
    const entries = await db.ledgerEntry.findMany({
      where: { orgId: member.orgId },
      orderBy: { date: "asc" }
    });

    if (entries.length === 0) {
      return new NextResponse("No data found to export.", { status: 404 });
    }

    // Compile strict CSV structure mapping directly to Indian CA Double-Entry Standards
    const csvHeaders = ["Date", "Account_Name", "Transaction_Type", "Amount", "Reference_ID", "Audit_Timestamp"];
    
    let csvData = entries.map(row => {
      const formattedDate = row.date.toISOString().split("T")[0];
      const auditStamp = row.createdAt.toISOString();
      return `"${formattedDate}","${row.account}","${row.type}","${row.amount}","${row.referenceId}","${auditStamp}"`;
    });

    const finalBlob = [csvHeaders.join(","), ...csvData].join("\n");

    return new NextResponse(finalBlob, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="CA_EXPORT_${member.organization.name.toUpperCase().replace(/\s+/g, "_")}_${Date.now()}.csv"`,
      }
    });
  } catch (error) {
    console.error("CA Export Compilation Engine Error:", error);
    return new NextResponse("Internal Audit Error", { status: 500 });
  }
}
