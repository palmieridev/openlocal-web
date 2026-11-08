import type { AccessSource, Module, ModuleEntitlement, Tier } from "./modules";

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

export type AdminAccessSource = AccessSource;
export interface AdminModule extends ModuleEntitlement {}

export interface Grant {
  id: string;
  business_id: string;
  module: Module;
  tier: "essential" | "business";
  starts_at: string;
  expires_at: string | null;
  indefinite: boolean;
  status: "active" | "scheduled" | "expired" | "revoked";
  internal_reason: string;
  owner_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
}
export interface GrantPage {
  items: Grant[];
  total: number;
  limit: number;
  offset: number;
}
export interface GrantHistory {
  items: {
    id: string;
    actor_user_id: string | null;
    action: string;
    at: string;
    metadata: { internal_reason: string; before: Grant | null; after: Grant };
  }[];
  limit: number;
  offset: number;
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
    scheduled_change: {
      tier: Tier;
      modules: Module[];
      effective_at: string;
    } | null;
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
