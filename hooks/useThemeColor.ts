"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { getThemeById } from "@/lib/themes";

export function useThemeColor() {
  const { resolvedTheme } = useTheme();
  const [currentThemeId, setCurrentThemeId] = useState("mor");

  useEffect(() => {
    const saved = localStorage.getItem("kuzu-color-theme") || "mor";
    setCurrentThemeId(saved);
    applyTheme(saved, resolvedTheme || "dark");
  }, [resolvedTheme]);

  const baseVars = [
    "--background", "--foreground", "--card", "--card-foreground",
    "--popover", "--popover-foreground", "--secondary", "--secondary-foreground",
    "--accent-foreground", "--input",
  ];

  const applyTheme = useCallback((themeId: string, mode: string) => {
    const theme = getThemeById(themeId);
    const colors = mode === "dark" ? theme.colors.dark : theme.colors.light;
    const root = document.documentElement;
    // Clear base overrides from previous theme so CSS defaults apply
    baseVars.forEach((key) => {
      if (!(key in colors)) root.style.removeProperty(key);
    });
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, []);

  const setTheme = useCallback(
    (themeId: string) => {
      localStorage.setItem("kuzu-color-theme", themeId);
      setCurrentThemeId(themeId);
      applyTheme(
        themeId,
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    },
    [applyTheme]
  );

  return { currentThemeId, setTheme };
}
