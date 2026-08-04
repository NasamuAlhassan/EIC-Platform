"use client";

import * as React from "react";
import { markRead } from "./actions";

/**
 * Marks the listed announcements as read once, shortly after the page settles.
 *
 * The small delay means a member who lands on the page and immediately clicks
 * away isn't recorded as having read anything.
 */
export function MarkRead({ ids }: { ids: string[] }) {
  const key = ids.join(",");

  React.useEffect(() => {
    if (!key) return;

    const timer = setTimeout(() => {
      void markRead(key.split(","));
    }, 1200);

    return () => clearTimeout(timer);
  }, [key]);

  return null;
}
