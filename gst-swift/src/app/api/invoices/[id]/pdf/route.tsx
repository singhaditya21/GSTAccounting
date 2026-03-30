import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import ReactPDF, { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Simulated Dictionary injection for Party-Level Localization
const dictionaries: Record<string, any> = {
  en: { title: "TAX INVOICE", to: "Billed To", date: "Date", total: "Grand Total", tax: "Tax Amount", items: "Items" },
  es: { title: "FACTURA FISCAL", to: "Facturado A", date: "Fecha", total: "Gran Total", tax: "Monto del Impuesto", items: "Artículos" },
  hi: { title: "कर बीजक (TAX INVOICE)", to: "ग्राहक", date: "दिनांक", total: "कुल राशि", tax: "कर", items: "सामग्री" },
  fr: { title: "FACTURE FISCALE", to: "Facturé À", date: "Date", total: "Total Général", tax: "Montant de la Taxe", items: "Articles" },
  ar: { title: "فاتورة ضريبية", to: "فاتورة إلى", date: "تاريخ", total: "المجموع الإجمالي", tax: "قيمة الضريبة", items: "عناصر" }
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#333' },
  header: { fontSize: 24, marginBottom: 20, fontWeight: 'bold', color: '#111' },
  section: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  box: { flex: 1 },
  label: { fontSize: 9, color: '#666', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 12, fontWeight: 'bold' },
  table: { width: '100%', marginBottom: 20, borderTop: 1, borderTopColor: '#eee' },
  tableRow: { flexDirection: 'row', borderBottom: 1, borderBottomColor: '#eee', paddingVertical: 8 },
  tableColHead: { flex: 1, fontSize: 10, color: '#666' },
  tableCol: { flex: 1, fontSize: 10 },
  totalBox: { alignSelf: 'flex-end', width: '50%', borderTop: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }
});

const InvoiceDocument = ({ invoice, dict }: { invoice: any, dict: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>{dict.title}</Text>
      
      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>{dict.to}</Text>
          <Text style={styles.value}>{invoice.customer.legalName}</Text>
          <Text style={{ fontSize: 10, marginTop: 2 }}>{invoice.customer.billingAddress}</Text>
          <Text style={{ fontSize: 10 }}>{invoice.customer.billingState} - {invoice.customer.billingPincode}</Text>
          {invoice.customer.gstin && <Text style={{ fontSize: 10, marginTop: 5 }}>GSTIN: {invoice.customer.gstin}</Text>}
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>Invoice #</Text>
          <Text style={styles.value}>{invoice.number}</Text>
          <Text style={[styles.label, { marginTop: 10 }]}>{dict.date}</Text>
          <Text style={styles.value}>{new Date(invoice.date).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableColHead, { flex: 2 }]}>{dict.items}</Text>
          <Text style={styles.tableColHead}>Qty</Text>
          <Text style={styles.tableColHead}>Price</Text>
          <Text style={styles.tableColHead}>Total</Text>
        </View>
        {invoice.items.map((item: any) => (
          <View style={styles.tableRow} key={item.id}>
            <Text style={[styles.tableCol, { flex: 2 }]}>{item.description || "Product"}</Text>
            <Text style={styles.tableCol}>{item.quantity}</Text>
            <Text style={styles.tableCol}>{item.unitPrice}</Text>
            <Text style={styles.tableCol}>{item.totalAmount}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
           <Text style={styles.label}>Subtotal:</Text>
           <Text style={styles.value}>{invoice.taxableValue}</Text>
        </View>
        <View style={styles.totalRow}>
           <Text style={styles.label}>{dict.tax}:</Text>
           <Text style={styles.value}>{invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount}</Text>
        </View>
        <View style={styles.totalRow}>
           <Text style={[styles.label, { fontWeight: 'bold', color: '#000' }]}>{dict.total} ({invoice.currency}):</Text>
           <Text style={[styles.value, { fontSize: 14 }]}>{invoice.grandTotal.toFixed(2)}</Text>
        </View>
      </View>

    </Page>
  </Document>
);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await db.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      branch: true,
      items: true
    }
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // PULL PARTY-LEVEL SETTINGS! We ignore the global org state and explicitly render English or Spanish based on THIS specific customer.
  const lang = invoice.customer.preferredLanguage || "en";
  const dict = dictionaries[lang] || dictionaries["en"];

  // Generate PDF Buffer dynamically via React
  const renderStream = await ReactPDF.renderToStream(<InvoiceDocument invoice={invoice} dict={dict} />);
  
  return new NextResponse(renderStream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${invoice.number}.pdf"`
    }
  });
}
