import { supabase } from "./supabase";

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, home_timezone, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveProfile({ userId, displayName, homeTimeZone }) {
  const profile = {
    id: userId,
    display_name: displayName.trim(),
    home_timezone: homeTimeZone,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("id, display_name, home_timezone, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
