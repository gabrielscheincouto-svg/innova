import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Re-exporta os tipos do schema
export type {
  Profile,
  Company,
  UserCompany,
  AuditLog,
  UserRole,
  CompanyStatus,
  SystemKey,
  PlanTier,
  Assessment,
  IparItem,
  ActionItem,
  HazardCommunication,
  Database,
} from './types';

// Cliente Supabase sem generic — mais leve e flexível em monorepo TS
let client: SupabaseClient | null = null;

/**
 * Inicializa o cliente Supabase. Chame uma vez na inicialização da app.
 * As variáveis vêm do Vite (import.meta.env).
 */
export function initSupabase(url: string, anonKey: string): SupabaseClient {
  if (client) return client;
  if (!url || !anonKey) {
    throw new Error(
      '[@innova/supabase] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios. Verifique seu .env.'
    );
  }
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'innova-app',
      },
    },
  });
  return client;
}

/**
 * Retorna o cliente já inicializado. Erro se chamado antes de initSupabase().
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error(
      '[@innova/supabase] Cliente não inicializado. Chame initSupabase() primeiro.'
    );
  }
  return client;
}

/**
 * Helper de audit log — registra ação sensível
 */
export async function logAudit(params: {
  action: string;
  resource_type: string;
  resource_id?: string;
  meta?: Record<string, unknown>;
}) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  await sb.from('audit_logs').insert({
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    action: params.action,
    resource_type: params.resource_type,
    resource_id: params.resource_id ?? null,
    meta: params.meta ?? null,
  });
}
