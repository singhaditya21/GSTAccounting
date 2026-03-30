import { db } from "@/lib/db";

interface Gstr1B2b {
  ctin: string; // GSTIN of Customer
  inv: {
    inum: string;
    idt: string;
    val: number;
    pos: string;
    rchrg: "Y" | "N";
    inv_typ: "R" | "SEWP" | "SEWOP" | "DE" | "CBW";
    itms: {
      num: number;
      itm_det: {
        txval: number;
        rt: number;
        iamt?: number;
        camt?: number;
        samt?: number;
      };
    }[];
  }[];
}

export async function generateGstr1Json(orgId: string, month: number, year: number) {
  // ISO Date calculations for filtering
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  // Fetch all issued invoices
  const invoices = await db.invoice.findMany({
    where: {
      orgId,
      date: { gte: startOfMonth, lt: endOfMonth },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: { customer: true, items: true },
  });

  const b2b: Record<string, Gstr1B2b> = {};

  invoices.forEach((inv) => {
    // Determine if B2B (Customer has GSTIN)
    if (inv.customer.gstin && inv.customer.gstin.length === 15) {
      const ctin = inv.customer.gstin;
      
      if (!b2b[ctin]) {
        b2b[ctin] = { ctin, inv: [] };
      }

      b2b[ctin].inv.push({
        inum: inv.number,
        idt: inv.date.toISOString().split('T')[0].split('-').reverse().join('-'), // DD-MM-YYYY
        val: inv.grandTotal,
        pos: inv.placeOfSupply,
        rchrg: "N",
        inv_typ: "R", // Regular B2B
        itms: inv.items.map((item, idx) => ({
          num: idx + 1,
          itm_det: {
            txval: item.taxableValue,
            rt: 18, // Simplified: Real app maps `item.product.gstRate`
            iamt: item.igstAmount > 0 ? item.igstAmount : undefined,
            camt: item.cgstAmount > 0 ? item.cgstAmount : undefined,
            samt: item.sgstAmount > 0 ? item.sgstAmount : undefined,
          }
        }))
      });
    }
  });

  // Convert dictionary back to array
  const b2bArray = Object.values(b2b);

  const org = await db.organization.findUnique({ where: { id: orgId } });

  // Return the official GSTR-1 schema architecture
  return {
    gstin: org?.gstin || "N/A",
    fp: `${month.toString().padStart(2, "0")}${year}`,
    gt: org?.turnoverThreshold, 
    b2b: b2bArray,
    // Note: Enterprise additions will map b2cs, cdnr, exp, hsn, and doc_issue here.
  };
}
