export type ThemeColors = {
  id: string;
  name: string;
  description: string;
  category: "genel" | "kizlar" | "erkekler" | "retro";
  colors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

export const themes: ThemeColors[] = [
  {
    id: "mor",
    name: "mor tema",
    description: "varsayılan kuzu sözlük teması",
    category: "genel",
    colors: {
      light: {
        "--primary": "#9333ea",
        "--primary-foreground": "#ffffff",
        "--accent": "#faf5ff",
        "--ring": "#9333ea",
      },
      dark: {
        "--primary": "#a78bfa",
        "--primary-foreground": "#0f0f12",
        "--accent": "#2d2a35",
        "--ring": "#a78bfa",
      },
    },
  },
  {
    id: "mavi",
    name: "mavi tema",
    description: "ntv sözlük tarzı klasik mavi",
    category: "retro",
    colors: {
      light: {
        "--primary": "#2563eb",
        "--primary-foreground": "#ffffff",
        "--accent": "#eff6ff",
        "--ring": "#2563eb",
      },
      dark: {
        "--primary": "#60a5fa",
        "--primary-foreground": "#0a0a12",
        "--accent": "#1e293b",
        "--ring": "#60a5fa",
      },
    },
  },
  {
    id: "yesil",
    name: "yeşil tema",
    description: "ekşi tarzı yeşil",
    category: "genel",
    colors: {
      light: {
        "--primary": "#16a34a",
        "--primary-foreground": "#ffffff",
        "--accent": "#f0fdf4",
        "--ring": "#16a34a",
      },
      dark: {
        "--primary": "#4ade80",
        "--primary-foreground": "#0a0f0a",
        "--accent": "#1a2e1a",
        "--ring": "#4ade80",
      },
    },
  },
  {
    id: "pembe",
    name: "pembe rüya",
    description: "yumuşak pembe tonları",
    category: "kizlar",
    colors: {
      light: {
        "--primary": "#ec4899",
        "--primary-foreground": "#ffffff",
        "--accent": "#fdf2f8",
        "--ring": "#ec4899",
      },
      dark: {
        "--primary": "#f472b6",
        "--primary-foreground": "#0f0a0d",
        "--accent": "#352a30",
        "--ring": "#f472b6",
      },
    },
  },
  {
    id: "lavanta",
    name: "lavanta bahçesi",
    description: "huzur veren lavanta",
    category: "kizlar",
    colors: {
      light: {
        "--primary": "#8b5cf6",
        "--primary-foreground": "#ffffff",
        "--accent": "#f5f3ff",
        "--ring": "#8b5cf6",
      },
      dark: {
        "--primary": "#c4b5fd",
        "--primary-foreground": "#0f0d15",
        "--accent": "#2e2a3a",
        "--ring": "#c4b5fd",
      },
    },
  },
  {
    id: "celik",
    name: "çelik mavisi",
    description: "sert ve maskülen",
    category: "erkekler",
    colors: {
      light: {
        "--primary": "#475569",
        "--primary-foreground": "#ffffff",
        "--accent": "#f1f5f9",
        "--ring": "#475569",
      },
      dark: {
        "--primary": "#94a3b8",
        "--primary-foreground": "#0a0c10",
        "--accent": "#1e293b",
        "--ring": "#94a3b8",
      },
    },
  },
  {
    id: "amber",
    name: "amber ateşi",
    description: "sıcak amber tonları",
    category: "erkekler",
    colors: {
      light: {
        "--primary": "#d97706",
        "--primary-foreground": "#ffffff",
        "--accent": "#fffbeb",
        "--ring": "#d97706",
      },
      dark: {
        "--primary": "#fbbf24",
        "--primary-foreground": "#0f0d05",
        "--accent": "#352e1a",
        "--ring": "#fbbf24",
      },
    },
  },
  {
    id: "kirmizi",
    name: "kırmızı tutku",
    description: "cesur kırmızı",
    category: "genel",
    colors: {
      light: {
        "--primary": "#dc2626",
        "--primary-foreground": "#ffffff",
        "--accent": "#fef2f2",
        "--ring": "#dc2626",
      },
      dark: {
        "--primary": "#f87171",
        "--primary-foreground": "#0f0a0a",
        "--accent": "#352020",
        "--ring": "#f87171",
      },
    },
  },
  {
    id: "turkuaz",
    name: "turkuaz deniz",
    description: "ferah deniz mavisi",
    category: "genel",
    colors: {
      light: {
        "--primary": "#0891b2",
        "--primary-foreground": "#ffffff",
        "--accent": "#ecfeff",
        "--ring": "#0891b2",
      },
      dark: {
        "--primary": "#22d3ee",
        "--primary-foreground": "#0a0f10",
        "--accent": "#1a2e30",
        "--ring": "#22d3ee",
      },
    },
  },
];

export function getThemeById(id: string) {
  return themes.find((t) => t.id === id) || themes[0];
}
