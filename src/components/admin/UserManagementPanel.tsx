import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Users, Shield, Eye, BarChart3, Plus, X, Loader2, UserCircle,
  Mail, ChevronDown, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useUserList, useAssignRole, useRevokeRole,
  type AppRole, type ManagedUser,
} from "@/hooks/useUserManagement";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<AppRole, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  admin: { icon: Shield, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "Admin" },
  analyst: { icon: BarChart3, color: "text-tf-cyan", bg: "bg-tf-cyan/10", border: "border-tf-cyan/30", label: "Analyst" },
  viewer: { icon: Eye, color: "text-muted-foreground", bg: "bg-muted/20", border: "border-border", label: "Viewer" },
};

const ALL_ROLES: AppRole[] = ["admin", "analyst", "viewer"];

function RoleBadge({ role, onRemove }: { role: AppRole; onRemove?: () => void }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] gap-1", cfg.bg, cfg.color, cfg.border)}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-0.5 hover:opacity-70">
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  );
}

function UserRow({ user, currentUserId }: { user: ManagedUser; currentUserId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const assignRole = useAssignRole();
  const revokeRole = useRevokeRole();

  const isSelf = user.userId === currentUserId;
  const initials = (user.displayName || user.email || "?")
    .split(/[\s@]/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join("");

  const availableRoles = ALL_ROLES.filter(r => !user.roles.includes(r));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border/50 bg-card/80 hover:border-primary/20 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-10 w-10 border border-border/50">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.displayName || "Unnamed User"}
                </p>
                {isSelf && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">You</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {user.email}
              </p>
            </div>

            {/* Roles */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {user.roles.length === 0 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                  No roles
                </Badge>
              )}
              {user.roles.map(role => (
                <RoleBadge
                  key={role}
                  role={role}
                  onRemove={
                    isSelf && role === "admin"
                      ? undefined
                      : () => revokeRole.mutate({ targetUserId: user.userId, role })
                  }
                />
              ))}
            </div>

            {/* Add Role Dropdown */}
            {availableRoles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Assign Role</div>
                  <DropdownMenuSeparator />
                  {availableRoles.map(role => {
                    const cfg = ROLE_CONFIG[role];
                    const Icon = cfg.icon;
                    return (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => assignRole.mutate({ targetUserId: user.userId, role })}
                        className="gap-2"
                      >
                        <Icon className={cn("w-4 h-4", cfg.color)} />
                        {cfg.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Expand */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Joined</span>
                    <p className="text-foreground font-medium">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Sign In</span>
                    <p className="text-foreground font-medium">
                      {user.lastSignIn
                        ? formatDistanceToNow(new Date(user.lastSignIn), { addSuffix: true })
                        : "Never"
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">User ID</span>
                    <p className="text-foreground font-mono text-[10px] truncate" title={user.userId}>
                      {user.userId.slice(0, 12)}…
                    </p>
                  </div>
                  {/* Mobile roles */}
                  <div className="sm:hidden col-span-2">
                    <span className="text-muted-foreground block mb-1">Roles</span>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                          No roles
                        </Badge>
                      )}
                      {user.roles.map(role => (
                        <RoleBadge
                          key={role}
                          role={role}
                          onRemove={
                            isSelf && role === "admin"
                              ? undefined
                              : () => revokeRole.mutate({ targetUserId: user.userId, role })
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function UserManagementPanel() {
  const { data: users, isLoading, error } = useUserList();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-destructive font-medium">Admin access required</p>
            <p className="text-xs text-muted-foreground mt-1">
              Only administrators can manage users and roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminCount = users?.filter(u => u.roles.includes("admin")).length ?? 0;
  const analystCount = users?.filter(u => u.roles.includes("analyst")).length ?? 0;
  const _viewerCount = users?.filter(u => u.roles.includes("viewer")).length ?? 0;
  const noRoleCount = users?.filter(u => u.roles.length === 0).length ?? 0;

  return (
    <div className="space-y-6">
      <Header />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={users?.length ?? 0} icon={Users} color="text-primary" />
        <StatCard label="Admins" value={adminCount} icon={Shield} color="text-destructive" />
        <StatCard label="Analysts" value={analystCount} icon={BarChart3} color="text-tf-cyan" />
        <StatCard label="No Role" value={noRoleCount} icon={UserCircle} color="text-muted-foreground" />
      </div>

      {/* User List */}
      <div className="space-y-2">
        {users?.map(user => (
          <UserRow key={user.userId} user={user} />
        ))}
        {(!users || users.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users found in this county</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
        <Users className="w-5 h-5 text-orange-400" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-foreground">User Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage roles and permissions for your county team
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={cn("w-5 h-5", color)} />
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
