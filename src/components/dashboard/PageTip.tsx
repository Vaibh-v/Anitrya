"use client";

import { useEffect, useState } from "react";

/** A dismissible first-visit tip; remembered per browser. */
export function PageTip(props: { id: string; title: string; text: string; href?: string }) {
  const key = `anitrya:tip:${props.id}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(key) !== "dismissed");
    } catch {
      setVisible(true);
    }
  }, [key]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(key, "dismissed");
    } catch {
      /* ignore */
    }
  }

  return (
    <aside className="eye-tip" role="note">
      <div>
        <strong>{props.title}</strong>
        <span>
          {props.text}
          {props.href ? <> <a href={props.href}>Learn more</a></> : null}
        </span>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss tip">Got it</button>
    </aside>
  );
}
