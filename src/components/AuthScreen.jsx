import { useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } =
      mode === "sign_up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (mode === "sign_up") {
      setMessage("Check your email to confirm your account, then sign in.");
    }

    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-pink-50 via-white to-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-pink-100/70 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-pink-700">
            <Heart className="h-4 w-4 fill-pink-200" />
            Together Time
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight">
            {mode === "sign_up" ? "Create your account" : "Welcome back"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to create or join a shared couple timeline.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </label>

            {message && (
              <p className="rounded-2xl bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-800">
                {message}
              </p>
            )}

            <button
              className="w-full rounded-2xl bg-pink-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-pink-200 transition active:scale-[0.99] disabled:opacity-60"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Please wait..."
                : mode === "sign_up"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <button
            className="mt-4 w-full rounded-2xl px-4 py-2 text-sm font-bold text-pink-700 transition hover:bg-pink-50"
            type="button"
            onClick={() => {
              setMessage("");
              setMode((current) =>
                current === "sign_up" ? "sign_in" : "sign_up",
              );
            }}
          >
            {mode === "sign_up"
              ? "Already have an account? Sign in"
              : "Need an account? Sign up"}
          </button>
        </section>
      </div>
    </main>
  );
}
