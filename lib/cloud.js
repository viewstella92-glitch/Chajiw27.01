import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const cloudEnabled = Boolean(url && key);
export const supabase = cloudEnabled ? createClient(url, key) : null;

// Chajiw is a personal, single-user app.
// All devices intentionally read/write the same Supabase record.
// No login is required.
const CLOUD_OWNER_ID = "chajiw-owner";

export async function loadCloudData() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("chajiw_cloud_data")
    .select("payload")
    .eq("device_id", CLOUD_OWNER_ID)
    .maybeSingle();

  if (error) throw error;
  return data?.payload || null;
}

export async function saveCloudData(payload) {
  if (!supabase) return { enabled: false };

  const { error } = await supabase.from("chajiw_cloud_data").upsert(
    {
      device_id: CLOUD_OWNER_ID,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id" }
  );

  if (error) throw error;
  return { enabled: true };
}
