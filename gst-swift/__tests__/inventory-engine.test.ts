import { expect, test, vi, beforeEach } from 'vitest';
import { allocateInventoryCheckout } from '@/lib/inventory-engine';
import { db } from '@/lib/db';

// Deep mock of the entire Prisma client
vi.mock('@/lib/db', () => ({
  db: {
    invoice: { findUnique: vi.fn() },
    $transaction: vi.fn((callback) => callback(db)), // Pass the mocked DB back into the transaction callback
    product: { findUnique: vi.fn() },
    branchInventory: { findUnique: vi.fn(), update: vi.fn() },
    warehouseTransaction: { create: vi.fn() }
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('allocateInventoryCheckout: Returns error if BranchInventory is insufficient', async () => {
  // 1. Mock the Invoice being queried
  (db.invoice.findUnique as any).mockResolvedValue({
    id: "inv-123",
    branchId: "branch-abc",
    items: [
      { productId: "prod-xyz", quantity: 10 }
    ],
    branch: { name: "Mumbai HQ" }
  });

  // 2. Mock the Product being a physical good
  (db.product.findUnique as any).mockResolvedValue({
    id: "prod-xyz",
    name: "MacBook Pro",
    isService: false,
    defaultPrice: 150000
  });

  // 3. SECONDS BEFORE DISASTER: Mock Branch Inventory having only 2 units (Requested: 10)
  (db.branchInventory.findUnique as any).mockResolvedValue({
    id: "inv-record-1",
    branchId: "branch-abc",
    productId: "prod-xyz",
    quantity: 2 // Insufficient!
  });

  // 4. Assert the exact ACID Database Exception is thrown
  await expect(allocateInventoryCheckout("inv-123")).rejects.toThrow(
    /Insufficient Inventory in Branch \[Mumbai HQ\] for Product \[MacBook Pro\]. Required: 10, Available: 2/
  );

  // 5. Ensure deduct logic was NEVER called (ACID Rollback Simulator)
  expect(db.branchInventory.update).not.toHaveBeenCalled();
  expect(db.warehouseTransaction.create).not.toHaveBeenCalled();
});

test('allocateInventoryCheckout: Successfully deducts and logs Warehouse FIFO if stock exists', async () => {
  (db.invoice.findUnique as any).mockResolvedValue({
    id: "inv-999",
    branchId: "branch-def",
    items: [
      { productId: "prod-xyz", quantity: 2 }
    ],
    branch: { name: "Delhi Warehouse" }
  });

  (db.product.findUnique as any).mockResolvedValue({
    id: "prod-xyz",
    name: "MacBook Pro",
    isService: false,
    defaultPrice: 150000
  });

  // Stock has 500 units, requested 2.
  (db.branchInventory.findUnique as any).mockResolvedValue({
    id: "inv-record-2",
    branchId: "branch-def",
    productId: "prod-xyz",
    quantity: 500
  });

  const response = await allocateInventoryCheckout("inv-999");
  expect(response.status).toBe("allocated successfully");

  // Validate the mathematical deduction hook fired
  expect(db.branchInventory.update).toHaveBeenCalledWith({
    where: { id: "inv-record-2" },
    data: { quantity: 498 } // 500 - 2
  });

  // Validate the FIFO Ledger log was written immutably
  expect(db.warehouseTransaction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        branchId: "branch-def",
        productId: "prod-xyz",
        quantity: -2,
        invoiceId: "inv-999"
      })
    })
  );
});
