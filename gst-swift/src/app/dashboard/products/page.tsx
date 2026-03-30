import { db } from "@/lib/db";
import { ProductFormSheet } from "./product-form-sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function ProductsPage() {
  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER", "ACCOUNTANT", "BRANCH_MANAGER"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  const products = await db.product.findMany({
    where: { orgId: member.orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goods & Services Catalog</h1>
          <p className="text-zinc-500">Manage your items, HSN/SAC codes, and default pricing.</p>
        </div>
        <ProductFormSheet />
      </div>

      <div className="border rounded-md bg-white dark:bg-zinc-950/50 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableHead>Item Name</TableHead>
              <TableHead>HSN / SAC</TableHead>
              <TableHead>GST Rate</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div>{product.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{product.unit}</div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{product.hsnSac}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono bg-indigo-50 text-indigo-700">{product.gstRate}%</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ₹{product.defaultPrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {product.isService ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Service</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Goods</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                  No items in your catalog. Click &quot;Add Item&quot; to define your first product.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
