import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER", "ACCOUNTANT"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  return children;
}
