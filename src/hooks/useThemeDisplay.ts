// src/hooks/useThemeDisplay.ts
import { useState, useEffect } from "react";
import { useTheme } from "@/shared/ui/theme-provider";

export const useThemeDisplay = () => {
  const { theme } = useTheme();
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const updateDisplayText = () => {
      switch (theme) {
        case "light":
          setDisplayText("☀️ Modo Claro");
          break;
        case "dark":
          setDisplayText("🌙 Modo Oscuro");
          break;
        case "system":
          const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          setDisplayText(`🖥️ Modo Sistema (${isSystemDark ? "Oscuro" : "Claro"})`);
          break;
        default:
          setDisplayText("🌙 Modo Oscuro");
      }
    };

    updateDisplayText();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => updateDisplayText();

      mediaQuery.addEventListener("change", handleChange);

      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return displayText;
};
