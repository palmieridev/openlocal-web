import { apiFetch } from "./client";
import type {
  Entitlements,
  Module,
  ModuleRequest,
  ModuleSettings,
  AppointmentResource,
  AppointmentService,
  PlanCatalog,
  Subscription,
} from "@/types/modules";
export const modulePublic = {
  plans: () => apiFetch<PlanCatalog>("/api/v1/public/plans"),
};
export function moduleApi(token: string, businessId: string) {
  const base = `/api/v1/businesses/${encodeURIComponent(businessId)}`;
  const get = <T>(path: string, query?: Record<string, string | undefined>) =>
    apiFetch<T>(`${base}${path}`, { token, query });
  return {
    entitlements: () => get<Entitlements>("/entitlements"),
    subscription: () => get<Subscription>("/subscription"),
    settings: (module: Module) => get<ModuleSettings>(`/${module}/settings`),
    services: () => get<AppointmentService[]>("/services"),
    resources: () => get<AppointmentResource[]>("/appointment-resources"),
    list: (module: Module, query?: Record<string, string | undefined>) =>
      get<{
        items: ModuleRequest[];
        total: number;
        limit: number;
        offset: number;
      }>(`/${module}`, query),
    detail: (module: Module, id: string) =>
      get<ModuleRequest>(`/${module}/${encodeURIComponent(id)}`),
  };
}
