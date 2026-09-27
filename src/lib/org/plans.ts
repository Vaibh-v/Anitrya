/**
 * Plans, roles and permissions (pure, no DB). The server checks these on every
 * protected request; the interface only mirrors them.
 */
export type PlanId = "trial" | "starter" | "growth" | "agency" | "founder" | "test";
export type OrgStatus = "trial" | "active" | "readonly" | "test";
export type RoleId = "OWNER" | "ADMIN" | "EDITOR" | "ANALYST" | "VIEWER" | "CLIENT_VIEWER";

export type Permission =
  | "view"
  | "sync"
  | "export"
  | "ai"
  | "manage_sources"
  | "manage_projects"
  | "manage_members"
  | "billing";

export type PlanLimits = {
  label: string;
  projects: number;
  seats: number;
  aiPerMonth: number;
  trialDays?: number;
};

const UNLIMITED = 1_000_000;

export const PLANS: Record<PlanId, PlanLimits> = {
  trial: { label: "Trial", projects: 2, seats: 3, aiPerMonth: 25, trialDays: 14 },
  starter: { label: "Starter", projects: 3, seats: 5, aiPerMonth: 200 },
  growth: { label: "Growth", projects: 10, seats: 15, aiPerMonth: 1000 },
  agency: { label: "Agency", projects: 50, seats: 50, aiPerMonth: 5000 },
  founder: { label: "Founder", projects: UNLIMITED, seats: UNLIMITED, aiPerMonth: UNLIMITED },
  test: { label: "Test", projects: 5, seats: 5, aiPerMonth: 100 },
};

export const ROLE_LABELS: Record<RoleId, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EDITOR: "Admin",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  CLIENT_VIEWER: "Client viewer",
};

/** Roles an Owner/Admin can hand out (EDITOR is a legacy alias of Admin). */
export const ASSIGNABLE_ROLES: RoleId[] = ["ADMIN", "ANALYST", "VIEWER", "CLIENT_VIEWER"];

const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  OWNER: ["view", "sync", "export", "ai", "manage_sources", "manage_projects", "manage_members", "billing"],
  ADMIN: ["view", "sync", "export", "ai", "manage_sources", "manage_projects", "manage_members"],
  EDITOR: ["view", "sync", "export", "ai", "manage_sources", "manage_projects", "manage_members"],
  ANALYST: ["view", "sync", "export", "ai"],
  VIEWER: ["view"],
  CLIENT_VIEWER: ["view"],
};

/** Permissions a read-only (expired trial) organization keeps. */
const READONLY_ALLOWED: Permission[] = ["view", "billing", "manage_members"];

/**
 * Owner-set restrictions: { "ANALYST": { "export": false, "ai": false } }.
 * Owners themselves are never restricted.
 */
export type RolePolicy = Partial<Record<RoleId, Partial<Record<Permission, boolean>>>>;

export function roleCan(input: { role: RoleId; status: OrgStatus; policy?: RolePolicy }, permission: Permission): boolean {
  if (!ROLE_PERMISSIONS[input.role]?.includes(permission)) return false;
  if (input.status === "readonly" && !READONLY_ALLOWED.includes(permission)) return false;
  if (input.role !== "OWNER" && input.policy?.[input.role]?.[permission] === false) return false;
  return true;
}

export function permissionsFor(input: { role: RoleId; status: OrgStatus; policy?: RolePolicy }): Permission[] {
  return ROLE_PERMISSIONS.OWNER.filter((p) => roleCan(input, p));
}

/** Effective status: a trial past its end date becomes read-only (nothing is deleted). */
export function effectiveStatus(input: { plan: PlanId; status: OrgStatus; trialEndsAt: Date | null; expiresAt: Date | null; now?: Date }): OrgStatus {
  const now = input.now ?? new Date();
  if (input.expiresAt && input.expiresAt < now) return "readonly";
  if (input.plan === "trial" && input.trialEndsAt && input.trialEndsAt < now) return "readonly";
  return input.status;
}

export function isRole(value: unknown): value is RoleId {
  return typeof value === "string" && value in ROLE_LABELS;
}
