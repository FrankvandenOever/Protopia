"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, AdvancedMarker, Map, useMapsLibrary, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { createClient } from "@/lib/supabase/client";
import { buildVisionPrompt, CATEGORIES, fmtLatLng, imageUrl } from "@/lib/projects";
import Compare from "./Compare";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

type Photo = { path: string; url: string; width: number; height: number };
type Vision = { id: string; url: string };

/** Shrink a photo in the browser to at most 1536 px on the long side and re-encode as JPEG. */
async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.88));
  return { blob, width, height };
}

/** Fills in a place name for a dropped pin using the Geocoding API. */
function ReverseGeocode({ pos, onName }: { pos: { lat: number; lng: number } | null; onName: (n: string) => void }) {
  const geocoding = useMapsLibrary("geocoding");
  useEffect(() => {
    if (!geocoding || !pos) return;
    new geocoding.Geocoder()
      .geocode({ location: pos })
      .then(({ results }) => {
        const pick = results.find((r) => r.types.includes("locality")) ?? results[0];
        if (pick) onName(pick.formatted_address);
      })
      .catch(() => {});
  }, [geocoding, pos, onName]);
  return null;
}

export default function NewVision({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [vision, setVision] = useState("");
  const [context, setContext] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Sidewalk");
  const [place, setPlace] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<Vision | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file (JPG, PNG or WebP).");
    setError(null);
    setBusy("Uploading photo…");
    try {
      const { blob, width, height } = await prepareImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setPhoto({ path, url: imageUrl("photos", path), width, height });
      setResult(null);
    } catch (e) {
      setError("Upload failed: " + (e instanceof Error ? e.message : "try another photo"));
    } finally {
      setBusy(null);
    }
  }

  async function visualize() {
    if (!photo) return;
    setError(null);
    setBusy("Visualizing… this takes about 30 seconds");
    try {
      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoPath: photo.path, vision, context, width: photo.width, height: photo.height }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Visualization failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Visualization failed");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!result || !pos) return;
    setError(null);
    setBusy("Adding to the map…");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualizationId: result.id, title: title || vision.slice(0, 80), vision, context, category, placeName: place, lat: pos.lat, lng: pos.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create the project");
      router.push(`/p/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the project");
      setBusy(null);
    }
  }

  const stepClass = (n: number) => (step > n ? "done" : step === n ? "on" : "");

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <div className="steps">
        <span className={stepClass(1)}>1 · Photo</span>
        <span className={stepClass(2)}>2 · Describe</span>
        <span className={stepClass(3)}>3 · Visualize</span>
      </div>

      {step === 1 && (
        <div className="card">
          <label className="drop" htmlFor="photo">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt="Your photo" />
            ) : (
              <>
                <b style={{ color: "var(--ink)" }}>Add a photo of the place</b>
                <span>A street, a lot, a riverbank: what it looks like today.</span>
              </>
            )}
          </label>
          <input id="photo" type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="row spread">
            <span className="note">{busy}</span>
            <button className="btn primary" type="button" disabled={!photo || !!busy} onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="field">
            <label htmlFor="vision">What do you envision?</label>
            <textarea id="vision" rows={2} value={vision} onChange={(e) => setVision(e.target.value)} placeholder="A beautiful sidewalk with nice lights" />
          </div>
          <div className="field">
            <label htmlFor="context">Context</label>
            <textarea id="context" rows={3} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Who uses this place, what's wrong with it today, any constraints" />
          </div>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="title">Project name</label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lit walkway on Main Street" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="category">Type</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Location: click the map where the photo was taken</label>
            <div className="minimap">
              <Map
                mapId={MAP_ID}
                defaultCenter={{ lat: 20, lng: 10 }}
                defaultZoom={2}
                gestureHandling="greedy"
                onClick={(e: MapMouseEvent) => e.detail.latLng && setPos(e.detail.latLng)}
              >
                {pos && <AdvancedMarker position={pos} />}
              </Map>
            </div>
            <ReverseGeocode pos={pos} onName={setPlace} />
            <div className="row">
              <span className="note mono">{pos ? fmtLatLng(pos.lat, pos.lng) : "No location yet"}</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="place">Place name</label>
            <input id="place" type="text" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Filled in when you drop the pin" />
          </div>
          <div className="row spread">
            <button className="btn ghost" type="button" onClick={() => setStep(1)}>
              ← Photo
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                if (!vision.trim()) return setError("Describe what you envision first.");
                if (!pos) return setError("Click the map to set the location.");
                setError(null);
                setStep(3);
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && photo && (
        <div className="card">
          <div className="field">
            <span className="eyebrow">Prompt sent to the image model</span>
            <pre className="prompt">{buildVisionPrompt(vision, context)}</pre>
          </div>
          {result ? (
            <Compare before={photo.url} after={result.url} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="Your photo" style={{ borderRadius: 12 }} />
          )}
          <div className="row spread">
            <button className="btn ghost" type="button" disabled={!!busy} onClick={() => setStep(2)}>
              ← Edit description
            </button>
            <div className="row">
              {busy && <span className="spin" aria-hidden="true" />}
              {result ? (
                <>
                  <button className="btn" type="button" disabled={!!busy} onClick={visualize}>
                    Try again
                  </button>
                  <button className="btn primary" type="button" disabled={!!busy} onClick={approve}>
                    Approve and add to map
                  </button>
                </>
              ) : (
                <button className="btn primary" type="button" disabled={!!busy} onClick={visualize}>
                  Visualize
                </button>
              )}
            </div>
          </div>
          {busy && <p className="note">{busy}</p>}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </APIProvider>
  );
}
