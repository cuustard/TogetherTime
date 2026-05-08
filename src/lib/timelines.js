import { supabase } from "./supabase";

function normaliseInviteCode(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function createInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomValues = new Uint8Array(8);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < randomValues.length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(randomValues)
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}

export async function fetchUserTimeline(userId) {
  const { data, error } = await supabase
    .from("timeline_members")
    .select(
      `
        role,
        joined_at,
        timelines (
          id,
          name,
          invite_code,
          created_by,
          created_at,
          updated_at
        )
      `,
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.timelines) {
    return null;
  }

  return {
    ...data.timelines,
    role: data.role,
    joined_at: data.joined_at,
  };
}

export async function createTimeline({ userId, name }) {
  const timelineName = name.trim() || "Together Time";
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();

    const { data: timeline, error: timelineError } = await supabase
      .from("timelines")
      .insert({
        name: timelineName,
        invite_code: inviteCode,
        created_by: userId,
      })
      .select("id, name, invite_code, created_by, created_at, updated_at")
      .single();

    if (timelineError) {
      lastError = timelineError;
      if (timelineError.code === "23505") continue;
      throw timelineError;
    }

    const { error: memberError } = await supabase
      .from("timeline_members")
      .insert({
        timeline_id: timeline.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      throw memberError;
    }

    return { ...timeline, role: "owner" };
  }

  throw lastError || new Error("Could not create a unique invite code.");
}

export async function joinTimelineByInviteCode(inviteCode) {
  const cleanInviteCode = normaliseInviteCode(inviteCode);

  if (!cleanInviteCode) {
    throw new Error("Enter an invite code.");
  }

  const { data, error } = await supabase.rpc("join_timeline_by_invite_code", {
    raw_invite_code: cleanInviteCode,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Invite code not found.");
  }

  return Array.isArray(data) ? data[0] : data;
}
