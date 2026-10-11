"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Spec = { id: string; label: string; value: string };
type Resource = { id: string; item: string; quantity: number; unit: string };
type Labour = { id: string; role: string; hours: number };

/** Build specifications, resources and labour. The project's creator can add rows and set the budget. */
export default function Requirements(props: {
  projectId: string;
  editable: boolean;
  budget: number | null;
  specs: Spec[];
  resources: Resource[];
  labour: Labour[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function done(res: PromiseLike<{ error: { message: string } | null }>) {
    setError(null);
    const { error } = await res;
    if (error) setError(error.message);
    else router.refresh();
  }

  async function setBudget(v: string) {
    const { error } = await createClient().from("projects").update({ budget_eur: Number(v) || null }).eq("id", props.projectId);
    if (error) setError(error.message);
    else router.refresh();
  }

  function onAdd(table: "project_specs" | "project_resources" | "project_labour") {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const a = String(f.get("a") ?? "").trim();
      const b = String(f.get("b") ?? "").trim();
      const c = String(f.get("c") ?? "").trim();
      if (!a || !b) return;
      const db = createClient();
      const project_id = props.projectId;
      if (table === "project_specs") done(db.from(table).insert({ project_id, label: a, value: b, sort: props.specs.length }));
      else if (table === "project_resources") done(db.from(table).insert({ project_id, item: a, quantity: Number(b), unit: c || "pcs" }));
      else done(db.from(table).insert({ project_id, role: a, hours: Number(b) }));
      e.currentTarget.reset();
    };
  }

  const empty = <p className="note" style={{ margin: 0 }}>Nothing added yet.</p>;

  return (
    <section className="card">
      <h2>Requirements</h2>

      <h3>Build specifications</h3>
      {props.specs.length ? (
        <div className="tbl"><table><tbody>{props.specs.map((s) => <tr key={s.id}><td>{s.label}</td><td>{s.value}</td></tr>)}</tbody></table></div>
      ) : empty}
      {props.editable && (
        <form className="addrow" onSubmit={onAdd("project_specs")}>
          <input name="a" type="text" placeholder="Item, e.g. Lamp spacing" aria-label="Specification item" required />
          <input name="b" type="text" placeholder="12 m" aria-label="Specification value" required style={{ gridColumn: "span 2" }} />
          <button className="btn" type="submit">Add</button>
        </form>
      )}

      <h3>Resources</h3>
      {props.resources.length ? (
        <div className="tbl"><table><tbody>{props.resources.map((r) => <tr key={r.id}><td>{r.item}</td><td className="num">{Number(r.quantity).toLocaleString("en-US")} {r.unit}</td></tr>)}</tbody></table></div>
      ) : empty}
      {props.editable && (
        <form className="addrow" onSubmit={onAdd("project_resources")}>
          <input name="a" type="text" placeholder="LED lamps" aria-label="Material" required />
          <input name="b" type="number" min={0} step="any" placeholder="Qty" aria-label="Quantity" required />
          <input name="c" type="text" placeholder="pcs" aria-label="Unit" />
          <button className="btn" type="submit">Add</button>
        </form>
      )}

      <h3>Labour</h3>
      {props.labour.length ? (
        <div className="tbl"><table><tbody>{props.labour.map((l) => <tr key={l.id}><td>{l.role}</td><td className="num">{Number(l.hours).toLocaleString("en-US")} h</td></tr>)}</tbody></table></div>
      ) : empty}
      {props.editable && (
        <form className="addrow" onSubmit={onAdd("project_labour")}>
          <input name="a" type="text" placeholder="Electrician" aria-label="Role" required />
          <input name="b" type="number" min={0} step="any" placeholder="Hours" aria-label="Hours" required style={{ gridColumn: "span 2" }} />
          <button className="btn" type="submit">Add</button>
        </form>
      )}

      {props.editable && (
        <div className="field" style={{ maxWidth: 240 }}>
          <label htmlFor="budget">Budget target (€)</label>
          <input id="budget" type="number" min={0} step={500} defaultValue={props.budget ?? ""} onBlur={(e) => setBudget(e.target.value)} placeholder="e.g. 25000" />
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
