/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const CrimsonTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urls = [
      "https://cdn.jsdelivr.net/gh/EldiiarBekbolotov/CrimsonJS@main/css/crimson.min.css",
      "https://cdn.jsdelivr.net/gh/EldiiarBekbolotov/CrimsonJS@main/js/crimson.min.js",
    ];

    const t = Date.now();
    urls.forEach((url) => {
      fetch(`${url}?t=${t}`, { mode: "no-cors", cache: "no-store" }).catch(
        () => {}
      ); // Silent catch
    });
  }, [pathname, searchParams]);

  return null;
};

export default CrimsonTracker;

