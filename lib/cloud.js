import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const cloudEnabled = Boolean(url && key);
export const supabase = cloudEnabled ? createClient(url, key) : null;

export function getDeviceId() {
  if (typeof window === "undefined") return null;
  const keyName = "chajiw:device-id";
  let id = localStorage.getItem(keyName);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(keyName, id);
  }
  return id;
}

export async function loadCloudData() {
  if (!supabase) return null;
  const deviceId = getDeviceId();
  const { data, error } = await supabase.from("chajiw_cloud_data").select("payload").eq("device_id", deviceId).maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

export async function saveCloudData(payload) {
  if (!supabase) return { enabled: false };
  const deviceId = getDeviceId();
  const { error } = await supabase.from("chajiw_cloud_data").upsert(
    { device_id: deviceId, payload, updated_at: new Date().toISOString() },
    { onConflict: "device_id" }
  );
  if (error) throw error;
  return { enabled: true };
}
