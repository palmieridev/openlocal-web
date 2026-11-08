import type { Module, ModuleEntitlement, Tier } from "./modules";

/** Private API projections. Never reuse these in public/owner views. */
export interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  clerk_org_id: string | null;
  business_type: string;
  status: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAccessSource {
  kind: "subscription" | "pilot" | "grant";
  tier: Tier;
  grant_id?: string;
  starts_at: string;
  expires_at: string | null;
  owner_message?: string;
}

export interface AdminModule extends ModuleEntitlement {
  tier: Tier;
  sources: AdminAccessSource[];
}

export interface AdminBusinessDetail {
  business: AdminBusiness;
  subscription: {
    tier: Tier;
    status: string;
    modules: Module[];
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    period_start: string | null;
    period_end: string | null;
    grace_until: string | null;
    cancel_at_period_end: boolean;
    scheduled_change: { tier: Tier; modules: Module[]; effective_at: string } | null;
    updated_at: string;
  } | null;
  access_role: "owner";
  modules: Record<Module, AdminModule>;
}

export interface AdminActivity {
  id: string;
  business_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
}

export interface AdminPage<T> {
  items: T[];
  next_cursor: string | null;
  limit: number;
}
