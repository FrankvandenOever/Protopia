export type MapProject = {
  id: string;
  title: string;
  category: string;
  place_name: string | null;
  lat: number;
  lng: number;
  vote_count: number;
  after_path: string;
  budget_eur: number | null;
};

export const CATEGORIES = ["Sidewalk", "Street", "Park", "Riverside", "Square", "Building", "Other"] as const;

/** Public URL of an image in one of the public storage buckets. */
export function imageUrl(bucket: "photos" | "visions", path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/** The prompt sent to the image model. Kept in one place so prototype and app stay in step. */
export function buildVisionPrompt(vision: string, context?: string | null) {
  return [
    `Using this input picture, visualize around this context: ${vision.trim()}`,
    context?.trim() ? `Background: ${context.trim()}` : "",
    "Keep the same camera angle, street layout and surrounding buildings. Show a realistic, buildable improvement, photographed in natural light.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const eur = (n: number | null | undefined) => "€" + Math.round(n ?? 0).toLocaleString("en-US");
export const fmtLatLng = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`;
