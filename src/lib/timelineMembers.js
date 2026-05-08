import { supabase } from "./supabase";

export async function fetchTimelineMembers(timelineId) {
  if (!timelineId) return [];

  const { data, error } = await supabase.rpc("get_timeline_member_profiles", {
    target_timeline_id: timelineId,
  });

  if (error) throw error;

  return (data || []).map((member) => ({
    user_id: member.user_id,
    display_name: member.display_name,
    home_timezone: member.home_timezone,
    role: member.role,
    joined_at: member.joined_at,
  }));
}
