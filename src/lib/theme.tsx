"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

/**
 * Substitui `next-themes` (removida — sem atualização desde março de
 * 2025, incompatível com a validação de hidratação do React 19/Next 16:
 * gera "Encountered a script tag while rendering React component" e
 * quebra a interatividade da árvore inteira envolvida pelo provider).
 *
 * O script que evita flash de tema errado fica em `layout.tsx` (Server
 * Component, então nunca re-renderiza no cliente — não dispara o aviso).
 * Este módulo só lê o estado real do DOM via `useSyncExternalStore`,
 * nunca tenta adivinhar o tema durante SSR.
 */

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

let listeners: Array<() => void> = [];
function notify() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage indisponível (modo privado etc.) — tema só não persiste.
  }
  notify();
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de ThemeProvider");
  return ctx;
}
