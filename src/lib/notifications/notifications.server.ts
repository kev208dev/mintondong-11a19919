/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/auth/account.server";

type Row = {
  id?: any;
  type?: any;
  title?: any;
  body?: any;
  deep_link?: any;
  read_at?: any;
  created_at?: any;
  [key: string]: any;
};
const db = () => adminClient() as unknown as SupabaseClient;

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
};

function mapNotification(row: Row): UserNotification {
  return {
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    deepLink: (row.deep_link as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function listNotifications(userId: string) {
  const { data, error } = await db()
    .from("user_notifications")
    .select("id,type,title,body,deep_link,read_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => mapNotification(row as Row));
}

export async function unreadNotificationCount(userId: string) {
  const { count, error } = await db()
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(userId: string, id: string) {
  const { error } = await db()
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return { ok: true };
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await db()
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return { ok: true };
}

export async function createUserNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  deepLink?: string | null;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
}) {
  const { error } = await db()
    .from("user_notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      deep_link: input.deepLink ?? null,
      metadata: input.metadata ?? {},
      dedupe_key: input.dedupeKey ?? null,
    });
  if (error && error.code !== "23505") throw error;
}
