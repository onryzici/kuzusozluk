"use client";

import { themes, type ThemeColors } from "@/lib/themes";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Check } from "lucide-react";

const categoryLabels: Record<ThemeColors["category"], string> = {
  genel: "genel",
  kizlar: "kızlar için",
  erkekler: "erkekler için",
  retro: "retro",
};

const categoryOrder: ThemeColors["category"][] = [
  "genel",
  "kizlar",
  "erkekler",
  "retro",
];

export default function TemaSec() {
  const { currentThemeId, setTheme } = useThemeColor();

  const grouped = categoryOrder.map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    items: themes.filter((t) => t.category === cat),
  }));

  return (
    <div className="space-y-6 border-t border-border/50 pt-6">
      <h2 className="text-sm font-medium text-foreground">renk teması</h2>
      <p className="text-xs text-muted-foreground -mt-4">
        arayüz rengini değiştirin. tema tercihiniz tarayıcınızda saklanır.
      </p>

      {grouped.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {group.label}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.items.map((theme) => {
              const isActive = currentThemeId === theme.id;
              const primaryColor = theme.colors.light["--primary"];

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setTheme(theme.id)}
                  className={`
                    relative flex items-start gap-2.5 rounded-md border p-2.5
                    text-left transition-colors cursor-pointer
                    ${
                      isActive
                        ? "border-primary bg-accent"
                        : "border-border/50 hover:border-border hover:bg-accent/50"
                    }
                  `}
                >
                  {/* color circle */}
                  <span
                    className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border/30"
                    style={{ backgroundColor: primaryColor }}
                  />

                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-foreground truncate">
                      {theme.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {theme.description}
                    </span>
                  </div>

                  {isActive && (
                    <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
