import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { eur, fmtLatLng, imageUrl } from "@/lib/projects";
import Compare from "@/components/Compare";
import VoteButton from "@/components/VoteButton";
import PledgeForm from "@/components/PledgeForm";
import Requirements from "@/components/Requirements";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: p } = await supabase
    .from("projects")
    .select(
      "id, creator_id, title, vision_prompt, context, category, place_name, lat, lng, before_path, after_path, budget_eur, vote_count, status, created_at, project_specs(id,label,value,sort), project_resources(id,item,quantity,unit), project_labour(id,role,hours), pledges(id,kind,amount,description,created_at)",
    )
    .eq("id", id)
    .single();
  if (!p) notFound();

  let voted = false;
  if (user) {
    const { data } = await supabase.from("votes").select("project_id").eq("project_id", id).eq("user_id", user.id).maybeSingle();
    voted = !!data;
  }

  const funds = p.pledges.filter((x) => x.kind === "funds").reduce((a, x) => a + Number(x.amount ?? 0), 0);
  const hours = p.pledges.filter((x) => x.kind === "labour").reduce((a, x) => a + Number(x.amount ?? 0), 0);
  const hoursNeeded = p.project_labour.reduce((a, x) => a + Number(x.hours), 0);
  const pct = p.budget_eur ? Math.min(100, (funds / Number(p.budget_eur)) * 100) : 0;
  const isCreator = user?.id === p.creator_id;
  const pledges = [...p.pledges].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <main className="page">
      <Link href="/" className="btn ghost" style={{ alignSelf: "flex-start" }}>
        ← Map
      </Link>
      <Compare before={imageUrl("photos", p.before_path)} after={imageUrl("visions", p.after_path)} />
      <div className="field">
        <span className="eyebrow">
          {p.category}
          {p.lat != null && p.lng != null && <> · <span className="mono">{fmtLatLng(p.lat, p.lng)}</span></>}
        </span>
        <h1>{p.title}</h1>
        {p.place_name && <span className="note">{p.place_name}</span>}
      </div>
      <div className="row">
        <VoteButton projectId={p.id} userId={user?.id ?? null} voted={voted} count={p.vote_count} />
      </div>
      <div className="meta">
        <div>
          <b>{eur(funds)}</b>
          <span>of {p.budget_eur ? eur(Number(p.budget_eur)) : "—"}</span>
        </div>
        <div>
          <b>{Math.round(hours).toLocaleString("en-US")} h</b>
          <span>of {hoursNeeded ? `${Math.round(hoursNeeded).toLocaleString("en-US")} h` : "—"} labour</span>
        </div>
        <div>
          <b>{Math.round(pct)}%</b>
          <span>funded</span>
        </div>
      </div>
      <div className="bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <blockquote className="quote">{p.vision_prompt}</blockquote>
      {p.context && <p className="note" style={{ margin: 0, fontSize: 15 }}>{p.context}</p>}

      <Requirements
        projectId={p.id}
        editable={isCreator}
        budget={p.budget_eur ? Number(p.budget_eur) : null}
        specs={[...p.project_specs].sort((a, b) => a.sort - b.sort)}
        resources={p.project_resources}
        labour={p.project_labour}
      />

      <section className="card">
        <h2>Contribute</h2>
        <PledgeForm projectId={p.id} userId={user?.id ?? null} />
        {pledges.length > 0 && (
          <div className="tbl">
            <table>
              <tbody>
                {pledges.map((x) => (
                  <tr key={x.id}>
                    <td>{x.kind === "funds" ? "Funds" : x.kind === "labour" ? "Labour" : "Materials"}{x.description ? ` · ${x.description}` : ""}</td>
                    <td className="num">{x.kind === "funds" ? eur(Number(x.amount)) : x.kind === "labour" ? `${Number(x.amount)} h` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
