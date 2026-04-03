"use client";

import { themes } from "@/lib/themes";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Check } from "lucide-react";

export default function TemaSec() {
  const { currentThemeId, setTheme } = useThemeColor();

  return (
    <div className="space-y-4 border-t border-border/50 pt-6 mt-6">
      <div>
        <h2 className="text-sm font-medium text-foreground">renk teması</h2>
        <p className="text-xs text-muted-foreground mt-1">
          arayüz rengini değiştirin. tema tercihiniz tarayıcınızda saklanır.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {themes.map((theme) => {
          const isActive = currentThemeId === theme.id;
          const primaryLight = theme.colors.light["--primary"];
          const primaryDark = theme.colors.dark["--primary"];

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setTheme(theme.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all cursor-pointer ${
                isActive
                  ? "border-primary bg-accent ring-1 ring-primary/30"
                  : "border-border/50 hover:border-border hover:bg-accent/50"
              }`}
            >
              {/* renk önizleme — light ve dark yan yana */}
              <div className="flex gap-0.5">
                <span
                  className="h-5 w-5 rounded-full border border-white/20"
                  style={{ backgroundColor: primaryLight }}
                />
                <span
                  className="h-5 w-5 rounded-full border border-white/20"
                  style={{ backgroundColor: primaryDark }}
                />
              </div>

              <span className="text-[11px] font-medium text-foreground">{theme.name}</span>

              {isActive && (
                <Check className="absolute top-1.5 right-1.5 h-3 w-3 text-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
