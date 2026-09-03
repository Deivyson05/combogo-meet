"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("combogo-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full
                 border border-ink-200 text-ink-600 transition-colors
                 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300
                 dark:hover:bg-ink-800"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
