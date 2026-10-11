"use client";
import { useState } from "react";

/** Before/after slider: drag to reveal the vision over the current situation. */
export default function Compare({ before, after }: { before: string; after: string }) {
  const [cut, setCut] = useState(50);
  return (
    <div className="compare" style={{ ["--cut" as string]: `${cut}%` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt="Current situation" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="after" src={after} alt="Visualized project" />
      <div className="handle" />
      <span className="lbl l">Now</span>
      <span className="lbl r">Vision</span>
      <input type="range" min={0} max={100} value={cut} onChange={(e) => setCut(+e.target.value)} aria-label="Compare current situation and vision" />
    </div>
  );
}
