"use client";

import { useEffect, useState } from "react";

export function RecommendationsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/intelligence/recommendations?project=${projectId}`)
      .then((r) => r.json())
      .then((d) => setData(d.recommendations || []));
  }, [projectId]);

  return (
    <div className="space-y-3">
      {data.map((r, i) => (
        <div key={i} className="p-4 border border-white/10 rounded-xl">
          <div className="text-white font-medium">{r.title}</div>
          <ul className="text-sm text-white/60 mt-2 list-disc pl-4">
            {r.steps.map((s: string, idx: number) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}