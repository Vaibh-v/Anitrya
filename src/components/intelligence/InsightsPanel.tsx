"use client";

import { useEffect, useState } from "react";

export function InsightsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/intelligence/insights?project=${projectId}`)
      .then((r) => r.json())
      .then((d) => setData(d.insights || []));
  }, [projectId]);

  return (
    <div className="space-y-3">
      {data.map((i) => (
        <div key={i.id} className="p-4 border border-white/10 rounded-xl">
          <div className="text-white">{i.statement}</div>
          <div className="text-xs text-white/50 mt-2">
            Confidence: {i.confidence}
          </div>
        </div>
      ))}
    </div>
  );
}