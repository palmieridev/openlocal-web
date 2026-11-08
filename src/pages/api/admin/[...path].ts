import type { APIRoute } from 'astro';
import { relayAdmin } from '@/lib/api/admin-relay';
export const prerender = false;
export const ALL: APIRoute = relayAdmin;
