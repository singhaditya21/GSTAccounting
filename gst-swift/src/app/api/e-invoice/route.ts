import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// Simulation of NIC E-Invoice API Sandbox credentials
const NIC_API_URL = "https://einv-apisandbox.nic.in/eivital/api";
const CLIENT_ID = process.env.NIC_CLIENT_ID || "demo_nic_client";

export async function POST(req: Request) {
  try {
    const { invoiceId, orgId } = await req.json();

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, orgId },
      include: { customer: true, items: true, branch: true }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.irn) return NextResponse.json({ irn: invoice.irn, qrData: invoice.qrData });

    // Step 1: Payload Formulation (Schema mapped to NIC Inv API Standard)
    const payload = {
      Version: "1.1",
      TranDtls: { TaxSch: "GST", SupTyp: "B2B", RegRev: "Y" },
      DocDtls: { Typ: "INV", No: invoice.number, Dt: invoice.date.toISOString().split("T")[0].split("-").reverse().join("/") },
      SellerDtls: { Gstin: "27AAAAA0000A1Z5", LglNm: "Vendor Corp", Add1: invoice.branch.address, Loc: "Mumbai", Pin: parseInt(invoice.branch.pincode), Stcd: invoice.branch.state },
      BuyerDtls: { Gstin: invoice.customer.gstin, LglNm: invoice.customer.legalName, Pos: invoice.placeOfSupply, Add1: invoice.customer.billingAddress, Loc: "City", Pin: parseInt(invoice.customer.billingPincode), Stcd: invoice.customer.billingState },
      ValDtls: { AssVal: invoice.taxableValue, CgstVal: invoice.cgstAmount, SgstVal: invoice.sgstAmount, IgstVal: invoice.igstAmount, TotInvVal: invoice.grandTotal },
      ItemList: invoice.items.map((it, i) => ({ SlNo: (i+1).toString(), PrdDesc: "Item", IsServc: "N", HsnCd: "-", Qty: it.quantity, Unit: "NOS", UnitPrice: it.unitPrice, TotAmt: it.totalAmount, AssAmt: it.taxableValue, GstRt: 18, IgstAmt: it.igstAmount, CgstAmt: it.cgstAmount, SgstAmt: it.sgstAmount, TotItemVal: it.totalAmount }))
    };

    // Step 2: Sandbox API Call Simulation (Cryptography substitution for demo)
    // Normally we'd do: fetch(`${NIC_API_URL}/GenerateIRN`, { method: "POST", body: ... })
    const simulatedIRN = crypto.createHash("sha256").update(JSON.stringify(payload) + Date.now().toString()).digest("hex");
    const simulatedQR = `https://gstswift.com/verify/${simulatedIRN}`;
    const ackNo = Math.floor(100000000000000 + Math.random() * 900000000000000).toString(); // 15 digit
    
    // Step 3: Embed into Government DB
    const updatedInvoice = await db.invoice.update({
      where: { id: invoice.id },
      data: {
        irn: simulatedIRN,
        qrData: simulatedQR,
        ackNo: ackNo,
        ackDate: new Date(),
      }
    });

    return NextResponse.json({ irn: updatedInvoice.irn, qrData: updatedInvoice.qrData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
