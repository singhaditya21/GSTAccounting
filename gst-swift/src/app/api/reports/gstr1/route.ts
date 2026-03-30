import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (!member) return new NextResponse("No org found", { status: 404 });

  // Fetch all invoices for the current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const invoices = await db.invoice.findMany({
    where: { 
      orgId: member.orgId, 
      createdAt: { gte: firstDay } 
    },
    include: { customer: true, items: true },
  });

  // Construct CBIC 2026 JSON structure for Offline Tool
  const gstr1 = {
    gstin: member.organization.gstin || "URP",
    fp: `${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`, // e.g. "032026"
    gt: 0, // Gross Turnover (Filled manually usually)
    b2b: [],
    b2cs: [], 
  };

  const b2bMap = new Map();
  const b2csMap = new Map();

  invoices.forEach(inv => {
    // Determine B2B vs B2C based on GSTIN presence
    if (inv.customer.gstin) {
      if (!b2bMap.has(inv.customer.gstin)) {
        b2bMap.set(inv.customer.gstin, {
          ctin: inv.customer.gstin,
          inv: []
        });
      }

      const itemDetails = inv.items.map(item => ({
        txval: item.taxableValue,
        rt: (item.igstAmount > 0) ? (item.igstAmount / item.taxableValue) * 100 : ((item.cgstAmount + item.sgstAmount)/item.taxableValue)*100, // Recover rate
        iamt: item.igstAmount,
        camt: item.cgstAmount,
        samt: item.sgstAmount,
      }));

      b2bMap.get(inv.customer.gstin).inv.push({
        inum: inv.number,
        idt: inv.date.toISOString().split("T")[0].replace(/-/g, ""), // DDMMYYYY required for JSON
        val: inv.grandTotal,
        pos: inv.placeOfSupply,
        inv_typ: "R",
        itms: [
          {
            num: 1,
            itm_det: itemDetails[0] // Simplified for MVP mapping
          }
        ]
      });

    } else {
      // B2C logic grouping by Place of Supply and Rate
      const posRateKey = `${inv.placeOfSupply}_18`; // Assuming fixed rate for simplicity in demo
      if (!b2csMap.has(posRateKey)) {
        b2csMap.set(posRateKey, {
          sply_ty: inv.placeOfSupply === member.organization.gstin?.substring(0,2) ? "INTRA" : "INTER", // Determine Intra/Inter
          rt: 18, // Simplified
          typ: "OE",
          pos: inv.placeOfSupply,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0
        });
      }

      const cs = b2csMap.get(posRateKey);
      cs.txval += inv.taxableValue;
      cs.iamt += inv.igstAmount;
      cs.camt += inv.cgstAmount;
      cs.samt += inv.sgstAmount;
    }
  });

  gstr1.b2b = Array.from(b2bMap.values()) as any;
  gstr1.b2cs = Array.from(b2csMap.values()) as any;

  return new NextResponse(JSON.stringify(gstr1, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="GSTR1_export_${today.getTime()}.json"`,
    },
  });
}
