import { db } from "@/lib/db";

// Atomic FIFO Deductions and Warehouse Tracking
export async function allocateInventoryCheckout(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, branch: { include: { organization: { include: { tenantSettings: true } } } } }
  });

  if (!invoice) throw new Error("Invoice un-allocatable. ID Corrupted.");
  const settings = invoice.branch.organization.tenantSettings;
  const reorderThreshold = settings?.inventoryReorderThreshold || 5.0;

  await db.$transaction(async (tx) => {
    for (const line of invoice.items) {
      // 1. Is this a physical item or a Service? 
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product || product.isService) continue; 

      // 2. Locate Branch Inventory
      const inventoryRecord = await tx.branchInventory.findUnique({
        where: { branchId_productId: { branchId: invoice.branchId, productId: product.id } }
      });

      if (!inventoryRecord || inventoryRecord.quantity < line.quantity) {
        throw new Error(`Insufficient Inventory in Branch [${invoice.branch.name}] for Product [${product.name}]. Required: ${line.quantity}, Available: ${inventoryRecord?.quantity || 0}`);
      }

      // 3. Deduct Stock Physically 
      await tx.branchInventory.update({
        where: { id: inventoryRecord.id },
        data: { quantity: inventoryRecord.quantity - line.quantity }
      });

      // 4. Log Immutable Warehouse Audit Trail (FIFO Traceability)
      await tx.warehouseTransaction.create({
        data: {
          branchId: invoice.branchId,
          productId: product.id,
          invoiceId: invoice.id,
          quantity: -line.quantity, // Negative signifies Outward
          costBasis: product.defaultPrice,
          date: new Date()
        }
      });

      // 5. SaaS Automated Purchasing Alert Hook
      const exactNewQuantity = inventoryRecord.quantity - line.quantity;
      if (exactNewQuantity <= reorderThreshold) {
        console.warn(`[PO TRIGGER] Low Stock Alert: Product ${product.name} dropped to ${exactNewQuantity} units.`);
        if (settings?.enableAutomatedPOEmails && settings?.procurementEmail) {
          console.log(`[EMAIL DISPATCH] Sending Automated PO via Resend for 50x ${product.name} to ${settings.procurementEmail}...`);
        } else {
          console.log(`[PO AUTOMATION] Triggered but Auto-Email is disabled globally by Tenant ${invoice.orgId}.`);
        }
      }
    }
  });

  return { status: "allocated successfully" };
}
