"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "dn-theme";

export function ThemeToggle({className=""}:{className?:string}) {
  const [theme, setTheme] = useState<"dark"|"light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
      onClick={toggle}
      className={`grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 ${className}`}
    >
      {theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}
    </button>
  );
}
