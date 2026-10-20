export type Module = "appointments" | "preorders";
export type Tier = "free" | "essential" | "business";
export type RequestStatus =
  | "requested"
  | "confirmed"
  | "preparing"
  | "ready"
  | "collected"
  | "completed"
  | "rejected"
  | "cancelled"
  | "expired"
  | "no_show"
  | "uncollected";
export interface ScheduleDay {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
}
export interface ModuleSettings {
  enabled: boolean;
  hours: ScheduleDay[];
  closed_dates: string[];
  lead_minutes: number;
  horizon_days: number;
  cancel_before_minutes: number;
  pending_ttl_minutes: number;
  max_orders_per_slot: number;
  daily_cutoff: string;
  slot_minutes: number;
  variant_rules: {
    variant_id: string;
    min_quantity: string;
    max_quantity: string;
    step: string;
  }[];
}
export interface AppointmentService {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: string | null;
  active: boolean;
  is_public: boolean;
  buffer_minutes: number;
}
export interface AppointmentResource {
  id: string;
  name: string;
  active: boolean;
  service_ids: string[];
  hours: ScheduleDay[];
  closed_dates: string[];
}
export interface AppointmentSlot {
  starts_at: string;
  ends_at: string;
  resource_id: string;
}
export interface PickupWindow {
  id: string;
  starts_at: string;
  ends_at: string;
}
export interface PreorderCatalogItem {
  variant_id: string;
  name: string;
  unit: string;
  unit_price: string;
  currency: string;
  step: string;
  min_quantity: string;
  max_quantity: string;
}
export interface RequestItem {
  id: string;
  variant_id: string;
  name: string;
  unit: string;
  quantity: string;
  unit_price: string;
  total: string;
  final_quantity?: string | null;
}
export interface StatusEvent {
  from_status: RequestStatus;
  to_status: RequestStatus;
  at: string;
  actor: string;
}
export interface ModuleRequest {
  id: string;
  public_id: string;
  reference: string;
  module: Module;
  status: RequestStatus;
  version: number;
  customer_name: string;
  customer_phone: string;
  customer_id?: string;
  notes?: string;
  starts_at?: string;
  ends_at?: string;
  pickup_starts_at?: string;
  pickup_ends_at?: string;
  pickup_window_id?: string;
  resource_id?: string;
  service_id?: string;
  service_name?: string;
  timezone: string;
  price?: string | null;
  estimated_total?: string;
  final_total?: string | null;
  items?: RequestItem[];
  expires_at?: string;
  created_at: string;
  history?: StatusEvent[];
  allowed_transitions: RequestStatus[];
  can_cancel?: boolean;
  business?: { name: string; slug: string; whatsapp: string | null };
  management_token?: string;
  management_url?: string;
}
export interface ModuleEntitlement {
  owned: boolean;
  enabled: boolean;
  can_accept_new: boolean;
  can_manage_existing: boolean;
  can_configure: boolean;
  can_operate: boolean;
  can_export: boolean;
  usage: number;
  limit: number;
  reason?: string;
  max_resources: number;
  advanced: boolean;
}
export interface Entitlements {
  tier: Tier;
  modules: Record<Module, ModuleEntitlement>;
  period_start: string;
  period_end: string;
  role: string;
}
export interface Plan {
  id: Tier;
  monthly_price: string;
  confirmation_limit: number;
  max_resources: number;
  team_access: boolean;
  advanced: boolean;
}
export interface PlanCatalog {
  plans: Plan[];
  second_module_price: string;
  currency: string;
  billing_available: boolean;
}
export interface Subscription {
  tier: Tier;
  status: string;
  modules: Module[];
  period_start: string;
  period_end: string;
  cancel_at_period_end: boolean;
  billing_available: boolean;
  scheduled_change?: { tier: Tier; modules: Module[]; effective_at: string };
  entitlements?: Entitlements;
}
