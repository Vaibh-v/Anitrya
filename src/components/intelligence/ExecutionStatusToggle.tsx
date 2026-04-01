"use client";

import { useState } from "react";

export function ExecutionStatusToggle({
  projectId,
  actionTitle,
  initialStatus,
}: {
  projectId: string;
  actionTitle: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);

  async function update(next: string) {
    setStatus(next);

    await fetch("/api/intelligence/execution-state", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        actionTitle,
        status: next,
      }),
    });
  }

  return (
    <select
      value={status}
      onChange={(e) => update(e.target.value)}
      className="rounded-md bg-black/20 px-2 py-1 text-xs text-white"
    >
      <option value="pending">pending</option>
      <option value="in_progress">in progress</option>
      <option value="blocked">blocked</option>
      <option value="completed">completed</option>
    </select>
  );
}