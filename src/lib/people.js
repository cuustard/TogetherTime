export function emojiForTimeZone(timeZone = "") {
  if (timeZone.includes("London") || timeZone.includes("Europe")) return "🇬🇧";
  if (timeZone.includes("Australia")) return "🇦🇺";
  if (timeZone.includes("America")) return "🇺🇸";
  if (timeZone.includes("Asia")) return "🌏";
  return "🌍";
}

export function buildPeopleFromTimelineMembers({ profile, members = [] }) {
  const currentUserMember =
    members.find((member) => member.user_id === profile?.id) || null;
  const partnerMember =
    members.find((member) => member.user_id !== profile?.id) || null;

  const currentName =
    currentUserMember?.display_name || profile?.display_name || "You";
  const currentTimeZone =
    currentUserMember?.home_timezone || profile?.home_timezone || "Europe/London";

  const partnerName = partnerMember?.display_name || "Waiting for partner";
  const partnerTimeZone =
    partnerMember?.home_timezone || currentTimeZone || "Europe/London";

  return {
    you: {
      userId: currentUserMember?.user_id || profile?.id || null,
      name: currentName,
      homeTimeZone: currentTimeZone,
      emoji: emojiForTimeZone(currentTimeZone),
      isPlaceholder: false,
    },
    partner: {
      userId: partnerMember?.user_id || null,
      name: partnerName,
      homeTimeZone: partnerTimeZone,
      emoji: partnerMember ? emojiForTimeZone(partnerTimeZone) : "♡",
      isPlaceholder: !partnerMember,
    },
  };
}
