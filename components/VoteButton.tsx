"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VoteButton(props: { projectId: string; userId: string | null; voted: boolean; count: number }) {
  const router = useRouter();
  const [voted, setVoted] = useState(props.voted);
  const [count, setCount] = useState(props.count);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!props.userId) return router.push(`/login?next=/p/${props.projectId}`);
    setBusy(true);
    const supabase = createClient();
    const { error } = voted
      ? await supabase.from("votes").delete().eq("project_id", props.projectId).eq("user_id", props.userId)
      : await supabase.from("votes").insert({ project_id: props.projectId, user_id: props.userId });
    if (!error) {
      setCount((c) => c + (voted ? -1 : 1));
      setVoted(!voted);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button className="btn" type="button" aria-pressed={voted} disabled={busy} onClick={toggle}>
      ▲ {voted ? "Upvoted" : "Upvote"} · {count}
    </button>
  );
}
