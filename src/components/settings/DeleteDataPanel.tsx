"use client";

import { useState } from "react";

/** Owner-only danger zone: permanently delete all of this organization's data. */
export function DeleteDataPanel(props: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setState("busy");
    const payload = await fetch("/api/org/delete-data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: typed }) })
      .then((r) => r.json())
      .catch(() => null);
    if (payload?.ok) {
      setState("done");
      setMessage("All data for this organization has been deleted. Reconnect Google from Settings to start again.");
    } else {
      setState("error");
      setMessage(payload?.error ?? "Deletion failed. Nothing was changed.");
    }
  }

  return (
    <div className="eye-panel eye-danger">
      <p className="eye-overline">Danger zone</p>
      <h3>Delete this organization&apos;s data</h3>
      <p className="eye-panel-text">Permanently removes every project, synced row, Google connection, AI answer and recorded outcome. Members and the plan stay. This can&apos;t be undone.</p>
      {!open ? (
        <button type="button" className="eye-button" onClick={() => setOpen(true)}>Delete data…</button>
      ) : state === "done" ? null : (
        <div className="eye-danger-confirm">
          <label>
            Type <strong>{props.orgName}</strong> to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Organization name" />
          </label>
          <button type="button" className="eye-button eye-button-danger" disabled={typed.trim() !== props.orgName.trim() || state === "busy"} onClick={run}>
            {state === "busy" ? "Deleting…" : "Delete permanently"}
          </button>
          <button type="button" className="eye-button" onClick={() => { setOpen(false); setTyped(""); }}>Cancel</button>
        </div>
      )}
      {message ? <p className={`eye-message ${state === "error" ? "is-error" : ""}`}>{message}</p> : null}
    </div>
  );
}
