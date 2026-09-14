import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database as AuthDatabase } from '../types/auth.js';
import type { Database as MatchDatabase } from '../types/match.js';
import type { Database as CredDatabase } from '../types/cred.js';
import type { Database as AuditDatabase } from '../types/audit.js';
import type { Database as NotifDatabase } from '../types/notif.js';

export interface SupabaseClients {
  auth: SupabaseClient<AuthDatabase>;
  match: SupabaseClient<MatchDatabase>;
  cred: SupabaseClient<CredDatabase>;
  audit: SupabaseClient<AuditDatabase>;
  notif: SupabaseClient<NotifDatabase>;
}

let clients: SupabaseClients | null = null;

export function createSupabaseClients(): SupabaseClients {
  if (clients) return clients;

  const required = [
    'SUPABASE_AUTH_URL',
    'SUPABASE_AUTH_SERVICE_KEY',
    'SUPABASE_MATCH_URL',
    'SUPABASE_MATCH_SERVICE_KEY',
    'SUPABASE_CRED_URL',
    'SUPABASE_CRED_SERVICE_KEY',
    'SUPABASE_AUDIT_URL',
    'SUPABASE_AUDIT_SERVICE_KEY',
    'SUPABASE_NOTIF_URL',
    'SUPABASE_NOTIF_SERVICE_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const createAdminClient = <T>(
    url: string,
    key: string
  ): SupabaseClient<T> => {
    return createClient<T>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  };

  clients = {
    auth: createAdminClient<AuthDatabase>(
      process.env.SUPABASE_AUTH_URL!,
      process.env.SUPABASE_AUTH_SERVICE_KEY!
    ),

    match: createAdminClient<MatchDatabase>(
      process.env.SUPABASE_MATCH_URL!,
      process.env.SUPABASE_MATCH_SERVICE_KEY!
    ),

    cred: createAdminClient<CredDatabase>(
      process.env.SUPABASE_CRED_URL!,
      process.env.SUPABASE_CRED_SERVICE_KEY!
    ),

    audit: createAdminClient<AuditDatabase>(
      process.env.SUPABASE_AUDIT_URL!,
      process.env.SUPABASE_AUDIT_SERVICE_KEY!
    ),

    notif: createAdminClient<NotifDatabase>(
      process.env.SUPABASE_NOTIF_URL!,
      process.env.SUPABASE_NOTIF_SERVICE_KEY!
    ),
  };

  return clients;
}

export function getSupabaseClients(): SupabaseClients {
  if (!clients) {
    return createSupabaseClients();
  }

  return clients;
}
