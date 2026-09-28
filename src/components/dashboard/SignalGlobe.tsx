"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GlobePoint } from "@/lib/geo/centroids";

type Lens = "All" | "Search" | "Traffic" | "Paid" | "Local";

const coastlines = [
  "-168 66,-140 70,-95 72,-80 68,-62 58,-55 50,-67 44,-76 35,-81 26,-97 26,-105 20,-95 16,-84 10,-78 8,-90 14,-105 22,-117 32,-124 40,-125 49,-140 58,-165 60",
  "-78 8,-60 10,-35 -6,-40 -22,-58 -38,-68 -54,-74 -45,-72 -20,-81 -5",
  "-10 36,-9 44,0 50,5 60,30 70,80 74,140 72,170 66,160 55,142 48,130 35,122 30,110 20,105 10,100 2,92 20,80 8,72 20,57 25,52 14,35 30,28 36,10 38",
  "-17 21,-10 35,10 37,32 31,43 12,51 11,40 -15,32 -28,20 -35,12 -18,9 4,-8 5,-17 14",
  "114 -22,130 -12,142 -11,153 -27,146 -39,130 -32,115 -34",
  "-6 50,2 51,0 53,-2 56,-5 59,-6 55,-10 52",
  "130 31,135 34,140 36,142 41,141 45,138 38,132 34",
].map((polygon) => polygon.split(",").map((point) => point.trim().split(" ").map(Number)));

function inside(longitude: number, latitude: number, polygon: number[][]) {
  let intersects = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    if ((polygon[index][1] > latitude) !== (polygon[previous][1] > latitude) &&
      longitude < ((polygon[previous][0] - polygon[index][0]) * (latitude - polygon[index][1])) /
      (polygon[previous][1] - polygon[index][1]) + polygon[index][0]) intersects = !intersects;
  }
  return intersects;
}

const terrain: Array<[number, number]> = [];
for (let latitude = -76; latitude <= 80; latitude += 2.8) {
  for (let longitude = -180; longitude < 180; longitude += 2.8) {
    if (coastlines.some((polygon) => inside(longitude, latitude, polygon))) {
      terrain.push([latitude * Math.PI / 180, longitude * Math.PI / 180]);
    }
  }
}

type City = { name: string; sessions: number };

export function SignalGlobe({ searchRows, trafficRows, paidRows, localRows, projectLabel, points = [], cities = [], totalSessions = 0 }: {
  searchRows: number; trafficRows: number; paidRows: number; localRows: number; projectLabel: string;
  points?: GlobePoint[]; cities?: City[]; totalSessions?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Start facing the biggest market so the first frame shows real traffic.
  const home = points[0]
    ? { longitude: -points[0].lon * Math.PI / 180, latitude: Math.max(-1.1, Math.min(1.1, points[0].lat * Math.PI / 180)), zoom: points.length > 1 && points.slice(1).every((p) => Math.abs(p.lon - points[0].lon) < 40) ? 1.3 : 1 }
    : { longitude: 2.1, latitude: .44, zoom: 1 };
  const rotation = useRef(home);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [lens, setLens] = useState<Lens>("All");
  const [layers, setLayers] = useState({ grid: true, scan: true, rings: true });

  const paint = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width * .34, height * .35) * rotation.current.zoom;
    const { longitude: angle, latitude: tilt } = rotation.current;

    function project(latitude: number, longitude: number): [number, number, number] {
      const relative = longitude + angle;
      const side = Math.cos(latitude) * Math.sin(relative);
      const vertical = Math.sin(latitude);
      const depth = Math.cos(latitude) * Math.cos(relative);
      return [centerX + side * radius, centerY - (vertical * Math.cos(tilt) - depth * Math.sin(tilt)) * radius,
        vertical * Math.sin(tilt) + depth * Math.cos(tilt)];
    }

    const haze = context.createRadialGradient(centerX, centerY, radius * .65, centerX, centerY, radius * 1.85);
    haze.addColorStop(0, "rgba(92,242,255,.20)");
    haze.addColorStop(.55, "rgba(139,123,255,.08)");
    haze.addColorStop(1, "rgba(139,123,255,0)");
    context.fillStyle = haze;
    context.fillRect(0, 0, width, height);

    if (layers.rings) {
      context.save();
      context.translate(centerX, centerY);
      context.strokeStyle = "rgba(92,242,255,.35)";
      context.lineWidth = 1;
      context.setLineDash([2, 9]);
      context.beginPath();
      context.arc(0, 0, radius * 1.29, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.strokeStyle = "rgba(139,123,255,.65)";
      context.lineWidth = 2;
      for (let part = 0; part < 3; part++) {
        context.beginPath();
        context.arc(0, 0, radius * 1.2, part * 2.1, part * 2.1 + 1.25);
        context.stroke();
      }
      context.restore();
    }

    const surface = context.createRadialGradient(centerX - radius * .35, centerY - radius * .45, 0, centerX, centerY, radius);
    surface.addColorStop(0, "#1b3260");
    surface.addColorStop(.65, "#0b1837");
    surface.addColorStop(1, "#050a18");
    context.fillStyle = surface;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();

    if (layers.grid) {
      context.strokeStyle = "rgba(140,200,255,.12)";
      context.lineWidth = 1;
      for (let latitude = -60; latitude <= 60; latitude += 30) {
        context.beginPath();
        let drawing = false;
        for (let longitude = -180; longitude <= 180; longitude += 3) {
          const [x, y, depth] = project(latitude * Math.PI / 180, longitude * Math.PI / 180);
          if (depth > 0) { if (drawing) context.lineTo(x, y); else context.moveTo(x, y); drawing = true; }
          else drawing = false;
        }
        context.stroke();
      }
    }

    for (const [latitude, longitude] of terrain) {
      const [x, y, depth] = project(latitude, longitude);
      if (depth > 0) {
        context.fillStyle = `rgba(120,215,255,${.18 + depth * .56})`;
        context.fillRect(x, y, 1.7, 1.7);
      }
    }
    // Audience markers: one per market, sized by its share of sessions.
    const top = points[0]?.sessions || 1;
    for (const [index, point] of points.entries()) {
      const [x, y, depth] = project(point.lat * Math.PI / 180, point.lon * Math.PI / 180);
      if (depth <= 0) continue;
      const share = Math.sqrt(point.sessions / top);
      const size = 2.2 + share * 7;
      const alpha = .35 + depth * .65;
      const glow = context.createRadialGradient(x, y, 0, x, y, size * 3.2);
      glow.addColorStop(0, `rgba(92,242,255,${.55 * alpha})`);
      glow.addColorStop(1, "rgba(92,242,255,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, size * 3.2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = point.keyEvents > 0 ? `rgba(74,222,157,${alpha})` : `rgba(210,250,255,${alpha})`;
      context.beginPath();
      context.arc(x, y, size * .55, 0, Math.PI * 2);
      context.fill();
      if (index < 3 && layers.rings) {
        const pulse = ((timestamp * .0006 + index * .33) % 1);
        context.strokeStyle = `rgba(92,242,255,${(1 - pulse) * .7 * alpha})`;
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(x, y, size + pulse * size * 3, 0, Math.PI * 2);
        context.stroke();
      }
    }

    if (layers.scan) {
      const scanY = centerY + Math.sin(timestamp * .0005) * radius * .9;
      const halfWidth = Math.sqrt(Math.max(0, radius * radius - (scanY - centerY) ** 2));
      const scan = context.createLinearGradient(centerX - halfWidth, 0, centerX + halfWidth, 0);
      scan.addColorStop(0, "transparent");
      scan.addColorStop(.5, "rgba(160,240,255,.8)");
      scan.addColorStop(1, "transparent");
      context.fillStyle = scan;
      context.fillRect(centerX - halfWidth, scanY, halfWidth * 2, 1.5);
    }
    context.restore();
    context.strokeStyle = "rgba(140,220,255,.7)";
    context.shadowColor = "#5cf2ff";
    context.shadowBlur = 18;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
    // Evidence rings show source coverage without claiming geographic signal locations.
    [searchRows, trafficRows, paidRows, localRows].forEach((rows, index) => {
      if (!rows) return;
      context.strokeStyle = ["#5cf2ff", "#8b7bff", "#ffc861", "#4ade9d"][index];
      context.lineWidth = 3;
      context.beginPath();
      context.arc(centerX, centerY, radius * (.78 - index * .07), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, Math.log1p(rows) / 10));
      context.stroke();
    });
  }, [layers, searchRows, trafficRows, paidRows, localRows, points]);

  useEffect(() => {
    let frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function animate(timestamp: number) {
      paint(timestamp);
      if (!reduced && !document.hidden) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    const redraw = () => paint(performance.now());
    const resume = () => { if (!document.hidden && !reduced) frame = requestAnimationFrame(animate); };
    window.addEventListener("resize", redraw);
    document.addEventListener("visibilitychange", resume);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", redraw); document.removeEventListener("visibilitychange", resume); };
  }, [paint]);

  const counts: Record<Lens, number | null> = {
    All: searchRows + trafficRows + paidRows + localRows,
    Search: searchRows,
    Traffic: trafficRows,
    Paid: paidRows,
    Local: localRows,
  };

  return (
    <section className="eye-globe-card" aria-label="Market signal map">
      <canvas
        ref={canvasRef}
        aria-label={points.length ? `Globe of where visitors come from: ${points.slice(0, 5).map((p) => p.label).join(", ")}. Drag to rotate, scroll to zoom.` : "Globe; drag to rotate or scroll to zoom. Visitor locations appear after the next sync."}
        onPointerDown={(event) => { pointer.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => {
          if (!pointer.current) return;
          rotation.current.longitude += (event.clientX - pointer.current.x) * .006;
          rotation.current.latitude = Math.max(-1.1, Math.min(1.1, rotation.current.latitude + (event.clientY - pointer.current.y) * .004));
          pointer.current = { x: event.clientX, y: event.clientY };
          paint(performance.now());
        }}
        onPointerUp={() => { pointer.current = null; }}
        onPointerCancel={() => { pointer.current = null; }}
        onWheel={(event) => { rotation.current.zoom = Math.max(.65, Math.min(1.45, rotation.current.zoom * (event.deltaY < 0 ? 1.08 : .92))); paint(performance.now()); }}
      />
      <div className="eye-globe-summary">
        <span className="eye-overline">{projectLabel} / {lens}</span>
        <strong>{counts[lens] === null ? "Map data unavailable" : `${counts[lens]!.toLocaleString()} evidence rows`}</strong>
        <span>{points.length ? `${totalSessions.toLocaleString()} sessions from ${points.length} ${points.length === 1 ? "market" : "markets"} · GA4` : "Visitor locations appear after the next sync"}</span>
      </div>
      {points.length > 0 ? (
        <div className="eye-globe-markets" aria-label="Top markets">
          <span className="eye-overline">{lens === "Local" && cities.length ? "Top cities" : "Top markets"}</span>
          <ol>
            {(lens === "Local" && cities.length ? cities.map((c) => ({ label: c.name, sessions: c.sessions })) : points)
              .slice(0, 6)
              .map((m) => (
                <li key={m.label}>
                  <span>{m.label}</span>
                  <strong className="eye-mono">{totalSessions ? `${Math.round((m.sessions / totalSessions) * 100)}%` : m.sessions.toLocaleString()}</strong>
                </li>
              ))}
          </ol>
        </div>
      ) : null}
      <div className="eye-globe-layers" role="group" aria-label="Globe layers">
        {(["grid", "scan", "rings"] as const).map((layer) => (
          <button key={layer} type="button" className="eye-chip" aria-pressed={layers[layer]} onClick={() => setLayers((current) => ({ ...current, [layer]: !current[layer] }))}>{layer}</button>
        ))}
        <button type="button" className="eye-chip" onClick={() => { rotation.current = { ...home }; paint(performance.now()); }}>Reset view</button>
      </div>
      <div className="eye-globe-filters" role="group" aria-label="Signal lens">
        {(Object.keys(counts) as Lens[]).map((option) => (
          <button key={option} type="button" className="eye-chip" aria-pressed={option === lens} onClick={() => setLens(option)}>{option}</button>
        ))}
      </div>
    </section>
  );
}
