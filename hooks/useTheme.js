"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("__chatstats_theme") ?? "dark";
    applyTheme(saved);
    setThemeState(saved);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("__chatstats_theme", next);
    setThemeState(next);
  };

  return { theme, toggle };
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === "light") {
    html.classList.add("light");
    html.classList.remove("dark");
  } else {
    html.classList.add("dark");
    html.classList.remove("light");
  }
}
