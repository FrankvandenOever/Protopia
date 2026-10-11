"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Kind = "funds" | "labour" | "materials";

export default function PledgeForm({ projectId, userId }: { projectId: string; userId: string | null }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("funds");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!userId)
    return (
      <p className="note" style={{ margin: 0 }}>
        <Link href={`/login?next=/p/${projectId}`}>Sign in</Link> to pledge funds, labour or materials.
      </p>
    );

  const uid: string = userId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (kind !== "materials" && !(n > 0)) return setMsg("Enter an amount above zero.");
    if (kind === "materials" && !note.trim()) return setMsg("Describe the materials you can provide.");
    setBusy(true);
    const { error } = await createClient()
      .from("pledges")
      .insert({ project_id: projectId, user_id: uid, kind, amount: kind === "materials" ? null : n, description: note.trim() || null });
    setBusy(false);
    if (error) return setMsg("Couldn't save the pledge: " + error.message);
    setAmount("");
    setNote("");
    setMsg("Pledge added. Thank you.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="field" style={{ gap: 10 }}>
      <div className="row" role="group" aria-label="Contribution type">
        {(["funds", "labour", "materials"] as Kind[]).map((k) => (
          <button key={k} type="button" className="btn" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === "funds" ? "Funds" : k === "labour" ? "Labour" : "Materials"}
          </button>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        {kind !== "materials" && (
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={kind === "funds" ? "Amount in €" : "Hours"} aria-label="Amount" style={{ maxWidth: 150 }} />
        )}
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "materials" ? "e.g. 20 bags of cement" : "Note (optional)"} aria-label="Note" />
      </div>
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy}>
          Pledge
        </button>
        <span className="note">Pledges are commitments only. No money is collected yet.</span>
      </div>
      {msg && <p className="note" style={{ margin: 0 }}>{msg}</p>}
    </form>
  );
}
