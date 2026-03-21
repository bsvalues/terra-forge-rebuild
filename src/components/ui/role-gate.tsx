// TerraFusion OS — Phase 84.3: Role Gate
// Conditionally renders children based on minimum required role.
//
// Usage:
//   <RoleGate minRole="analyst"><CertifyButton /></RoleGate>
//   <RoleGate minRole="admin" fallback={<p>Admin only</p>}><AdminPanel /></RoleGate>

import { useUserRole, roleAtLeast, type AppRole } from "@/hooks/useUserRole";

interface RoleGateProps {
  /** Minimum role required to render children */
  minRole: AppRole;
  children: React.ReactNode;
  /** Optional element to render when access is denied (default: null) */
  fallback?: React.ReactNode;
}

export function RoleGate({ minRole, children, fallback = null }: RoleGateProps) {
  const { primaryRole, isLoading } = useUserRole();
  if (isLoading) return null;
  if (!roleAtLeast(primaryRole, minRole)) return <>{fallback}</>;
  return <>{children}</>;
}
