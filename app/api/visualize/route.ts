import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { buildVisionPrompt, imageUrl } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const DAILY_LIMIT = Number(process.env.VISUALIZE_DAILY_LIMIT || 10);

/**
 * POST { photoPath, vision, context?, width, height }
 * Sends the user's photo and prompt to OpenAI's image edit endpoint, stores the result
 * in the `visions` bucket and records it in `visualizations`.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to visualize a project." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const photoPath = typeof body?.photoPath === "string" ? body.photoPath : "";
  const vision = typeof body?.vision === "string" ? body.vision.trim().slice(0, 500) : "";
  const context = typeof body?.context === "string" ? body.context.trim().slice(0, 1500) : "";
  if (!photoPath.startsWith(`${user.id}/`) || !vision)
    return NextResponse.json({ error: "A photo and a description are required." }, { status: 400 });

  const admin = createAdminClient();

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin
    .from("visualizations")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT)
    return NextResponse.json({ error: `You've reached today's limit of ${DAILY_LIMIT} visualizations. Try again tomorrow.` }, { status: 429 });

  const { data: photo, error: dlError } = await admin.storage.from("photos").download(photoPath);
  if (dlError || !photo) return NextResponse.json({ error: "Couldn't read the uploaded photo." }, { status: 400 });

  const w = Number(body?.width) || 1;
  const h = Number(body?.height) || 1;
  const size = w / h > 1.15 ? "1536x1024" : h / w > 1.15 ? "1024x1536" : "1024x1024";
  const prompt = buildVisionPrompt(vision, context);

  let b64: string | undefined;
  try {
    const openai = new OpenAI();
    const result = await openai.images.edit({
      model: MODEL,
      image: await toFile(Buffer.from(await photo.arrayBuffer()), "photo.jpg", { type: "image/jpeg" }),
      prompt,
      size,
      quality: "medium",
    });
    b64 = result.data?.[0]?.b64_json ?? undefined;
  } catch (e) {
    console.error("OpenAI image edit failed", e);
    return NextResponse.json({ error: "The image service didn't respond. Try again in a minute." }, { status: 502 });
  }
  if (!b64) return NextResponse.json({ error: "The image service returned no image. Try again." }, { status: 502 });

  const outPath = `${user.id}/${crypto.randomUUID()}.png`;
  const { error: upError } = await admin.storage
    .from("visions")
    .upload(outPath, Buffer.from(b64, "base64"), { contentType: "image/png" });
  if (upError) return NextResponse.json({ error: "Couldn't save the visualization." }, { status: 500 });

  const { data: row, error: insError } = await admin
    .from("visualizations")
    .insert({ creator_id: user.id, photo_path: photoPath, output_path: outPath, prompt, model: MODEL })
    .select("id")
    .single();
  if (insError || !row) return NextResponse.json({ error: "Couldn't record the visualization." }, { status: 500 });

  return NextResponse.json({ id: row.id, url: imageUrl("visions", outPath) });
}
