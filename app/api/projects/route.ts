import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/projects";

/**
 * POST { visualizationId, title, vision, context?, category, placeName?, lat, lng }
 * Turns an approved visualization into a project on the map.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to add a project." }, { status: 401 });

  const b = await req.json().catch(() => null);
  const lat = Number(b?.lat);
  const lng = Number(b?.lng);
  const title = String(b?.title ?? "").trim().slice(0, 120);
  const vision = String(b?.vision ?? "").trim().slice(0, 500);
  const category = (CATEGORIES as readonly string[]).includes(b?.category) ? b.category : "Other";
  if (!b?.visualizationId || title.length < 3 || !vision || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return NextResponse.json({ error: "Name, vision and location are required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: viz } = await admin
    .from("visualizations")
    .select("id, photo_path, output_path, project_id")
    .eq("id", b.visualizationId)
    .eq("creator_id", user.id)
    .single();
  if (!viz?.output_path) return NextResponse.json({ error: "That visualization wasn't found." }, { status: 404 });
  if (viz.project_id) return NextResponse.json({ id: viz.project_id });

  // Insert as the user so row-level security confirms they are the creator.
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      creator_id: user.id,
      title,
      vision_prompt: vision,
      context: String(b?.context ?? "").trim().slice(0, 1500) || null,
      category,
      place_name: String(b?.placeName ?? "").trim().slice(0, 200) || null,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      before_path: viz.photo_path,
      after_path: viz.output_path,
    })
    .select("id")
    .single();
  if (error || !project) return NextResponse.json({ error: "Couldn't create the project." }, { status: 500 });

  await admin.from("visualizations").update({ project_id: project.id }).eq("id", viz.id);
  return NextResponse.json({ id: project.id });
}
