import type { Module, RequestItem, RequestStatus, StatusEvent } from "./modules";
export interface CursorPage<T> { items: T[]; next_cursor: string | null; limit: number }
export interface SavedBusiness {
  business_id: string; saved_at: string; available: boolean;
  name: string | null; slug: string | null; logo_url: string | null;
}
export interface CustomerActivity {
  id: string; module: Module; reference: string; status: RequestStatus;
  created_at: string; starts_at: string; ends_at: string; timezone: string;
  business: { id: string; name: string; slug: string | null; available: boolean; logo_url: string | null };
}
export interface CustomerRequest extends CustomerActivity {
  version: number; expires_at?: string; customer_name: string; customer_phone: string;
  history: StatusEvent[]; allowed_transitions: RequestStatus[];
  service_id?: string; service_name?: string; duration_minutes?: number; price?: string;
  items?: RequestItem[]; estimated_total?: string; final_total?: string;
}
