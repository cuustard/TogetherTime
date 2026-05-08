import { useState } from "react";
import { Heart, Link2, LogOut, Plus, UsersRound } from "lucide-react";
import { supabase } from "../lib/supabase";
import { createTimeline, joinTimelineByInviteCode } from "../lib/timelines";

export default function TimelineOnboarding({ profile, session, onComplete }) {
  const [mode, setMode] = useState("create");
  const [timelineName, setTimelineName] = useState("Our Timeline");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      const timeline = await createTimeline({
        userId: session.user.id,
        name: timelineName,
      });
      onComplete(timeline);
    } catch (error) {
      setMessage(error.message || "Could not create your timeline.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      const timeline = await joinTimelineByInviteCode(inviteCode);
      onComplete(timeline);
    } catch (error) {
      setMessage(error.message || "Could not join that timeline.");
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
            Create or join your couple timeline
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Hi {profile.display_name}. Make a shared space, then give your
            partner the invite code so you can both see the same timeline.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                mode === "create"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
              type="button"
              onClick={() => {
                setMode("create");
                setMessage("");
              }}
            >
              Create
            </button>
            <button
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                mode === "join"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
              type="button"
              onClick={() => {
                setMode("join");
                setMessage("");
              }}
            >
              Join
            </button>
          </div>

          {mode === "create" ? (
            <form className="mt-5 space-y-4" onSubmit={handleCreate}>
              <label className="block">
                <span className="flex items-center gap-1 text-sm font-bold text-slate-700">
                  <UsersRound className="h-4 w-4" /> Timeline name
                </span>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                  type="text"
                  value={timelineName}
                  onChange={(event) => setTimelineName(event.target.value)}
                  placeholder="Our Timeline"
                  required
                />
              </label>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-pink-200 transition active:scale-[0.99] disabled:opacity-60"
                type="submit"
                disabled={busy}
              >
                <Plus className="h-4 w-4" />
                {busy ? "Creating..." : "Create timeline"}
              </button>
            </form>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleJoin}>
              <label className="block">
                <span className="flex items-center gap-1 text-sm font-bold text-slate-700">
                  <Link2 className="h-4 w-4" /> Invite code
                </span>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-black uppercase tracking-[0.25em] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                  type="text"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="ABC12345"
                  autoCapitalize="characters"
                  required
                />
              </label>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-pink-200 transition active:scale-[0.99] disabled:opacity-60"
                type="submit"
                disabled={busy}
              >
                <Link2 className="h-4 w-4" />
                {busy ? "Joining..." : "Join timeline"}
              </button>
            </form>
          )}

          {message && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
