import { useState } from "react";
import { Heart, LogOut, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getLocalTimeZone, prettyTimeZone } from "../lib/time";
import { saveProfile } from "../lib/profiles";

const COMMON_TIMEZONES = [
  "Europe/London",
  "Australia/Brisbane",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Pacific/Auckland",
];

function uniqueTimeZones(localTimeZone) {
  return Array.from(new Set([localTimeZone, ...COMMON_TIMEZONES]));
}

export default function ProfileOnboarding({ session, onComplete }) {
  const localTimeZone = getLocalTimeZone();
  const [displayName, setDisplayName] = useState(
    session.user?.email?.split("@")[0] || "",
  );
  const [homeTimeZone, setHomeTimeZone] = useState(localTimeZone);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!displayName.trim()) {
      setMessage("Add the name you want your partner to see.");
      return;
    }

    setBusy(true);

    try {
      const profile = await saveProfile({
        userId: session.user.id,
        displayName,
        homeTimeZone,
      });
      onComplete(profile);
    } catch (error) {
      setMessage(error.message || "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-pink-50 via-white to-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-pink-100/70 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-pink-700">
              <Heart className="h-4 w-4 fill-pink-200" />
              Together Time
            </div>
            <button
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500 active:scale-95"
              type="button"
              onClick={() => supabase.auth.signOut()}
            >
              <span className="inline-flex items-center gap-1">
                <LogOut className="h-3 w-3" /> Sign out
              </span>
            </button>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight">
            Set up your profile
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            This creates your profile row in Supabase. Couple timelines and
            invite links come next.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Display name
              </span>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Jake"
                autoComplete="name"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Home timezone
              </span>
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                value={homeTimeZone}
                onChange={(event) => setHomeTimeZone(event.target.value)}
              >
                {uniqueTimeZones(localTimeZone).map((timeZone) => (
                  <option key={timeZone} value={timeZone}>
                    {prettyTimeZone(timeZone)} · {timeZone}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl bg-pink-50 px-4 py-3 text-xs font-semibold leading-5 text-pink-800">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Detected device timezone
              </div>
              <div className="mt-1 text-pink-950">
                {prettyTimeZone(localTimeZone)} · {localTimeZone}
              </div>
            </div>

            {message && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {message}
              </p>
            )}

            <button
              className="w-full rounded-2xl bg-pink-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-pink-200 transition active:scale-[0.99] disabled:opacity-60"
              type="submit"
              disabled={busy}
            >
              {busy ? "Saving..." : "Continue"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
