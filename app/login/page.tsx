"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setState("idle");
    } else setState("sent");
  }

  if (state === "sent")
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p className="note">We sent a sign-in link to {email}. Open it on this device to continue.</p>
      </div>
    );

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
      <p className="note">No password needed. You need an account to add projects, vote and pledge.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="page" style={{ maxWidth: 440 }}>
      <h1>Sign in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
