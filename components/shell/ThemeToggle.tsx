"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "../ui";

type Mode = "light" | "dark";
const read = (): Mode => (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Light/dark switch. The first paint follows the system (see THEME_SCRIPT); a click pins the choice. */
export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("light");
  useEffect(() => setMode(read()), []);
  const flip = () => {
    const next: Mode = read() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setMode(next);
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={mode === "dark" ? "Light theme" : "Dark theme"}
      className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-sunk hover:text-ink transition-colors", className)}
    >
      {mode === "dark" ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}

/** Runs before paint: stored choice, else the system preference. Follows system changes until the user picks. */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)');var a=function(){var t=localStorage.getItem('theme')||(m.matches?'dark':'light');document.documentElement.dataset.theme=t;};a();if(!s&&m.addEventListener)m.addEventListener('change',function(){if(!localStorage.getItem('theme'))a();});}catch(e){document.documentElement.dataset.theme='light';}})();`;
