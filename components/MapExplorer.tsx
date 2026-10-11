"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { APIProvider, AdvancedMarker, Map, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { createClient } from "@/lib/supabase/client";
import { eur, imageUrl, type MapProject } from "@/lib/projects";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

type Bounds = { west: number; south: number; east: number; north: number };

export default function MapExplorer() {
  const [projects, setProjects] = useState<MapProject[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (b: Bounds) => {
    // A view that crosses the date line has west > east; ask for the full longitude range instead.
    const wraps = b.west > b.east;
    const supabase = createClient();
    const { data, error } = await supabase.rpc("projects_in_bbox", {
      west: wraps ? -180 : b.west,
      south: b.south,
      east: wraps ? 180 : b.east,
      north: b.north,
      max_rows: 300,
    });
    if (error) setError("Couldn't load projects. " + error.message);
    else {
      setError(null);
      setProjects((data ?? []).filter((p): p is typeof p & { lat: number; lng: number } => p.lat != null && p.lng != null));
    }
  }, []);

  const onBounds = useCallback(
    (e: MapCameraChangedEvent) => {
      if (timer.current) clearTimeout(timer.current);
      const b = e.detail.bounds;
      timer.current = setTimeout(() => load(b), 350);
    },
    [load],
  );

  useEffect(() => {
    load({ west: -180, south: -85, east: 180, north: 85 });
  }, [load]);

  const sorted = [...projects].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <main className="explore">
      <div className="mapbox">
        {MAPS_KEY ? (
          <APIProvider apiKey={MAPS_KEY}>
            <Map
              mapId={MAP_ID}
              defaultCenter={{ lat: 20, lng: 10 }}
              defaultZoom={2}
              minZoom={2}
              gestureHandling="greedy"
              disableDefaultUI={false}
              onBoundsChanged={onBounds}
              style={{ position: "absolute", inset: 0 }}
            >
              {projects.map((p) => (
                <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.title} onClick={() => setSelected(p.id)}>
                  <div
                    className={"pin" + (p.id === selected ? " on" : "")}
                    style={{ width: 14 + Math.min(14, Math.sqrt(p.vote_count) * 2), height: 14 + Math.min(14, Math.sqrt(p.vote_count) * 2) }}
                  />
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        ) : (
          <div className="page">
            <p className="error">The map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment settings.</p>
          </div>
        )}
      </div>
      <aside className="side">
        <div className="row spread">
          <h2>Projects in view</h2>
          <span className="note mono">{projects.length}</span>
        </div>
        {error && <p className="error">{error}</p>}
        {!error && projects.length === 0 && (
          <div className="card">
            <p style={{ margin: 0 }}>No projects here yet.</p>
            <p className="note" style={{ margin: 0 }}>
              Photograph a place you want to improve and be the first to put a vision on the map.
            </p>
            <Link href="/new" className="btn primary">
              Start a vision
            </Link>
          </div>
        )}
        <div className="plist">
          {sorted.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className={"pcard" + (p.id === selected ? " on" : "")} onMouseEnter={() => setSelected(p.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl("visions", p.after_path)} alt="" />
              <div style={{ minWidth: 0 }}>
                <div className="t">{p.title}</div>
                <div className="p">
                  {p.place_name || p.category}
                  {p.budget_eur ? ` · ${eur(p.budget_eur)}` : ""}
                </div>
              </div>
              <div className="votes">
                {p.vote_count}
                <small>votes</small>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </main>
  );
}
