"use client";

// Karakterin vektör SVG render'ı. Skin/hair/armor/weapon tint'e göre renklenir.

const SKIN_COLORS = ["#f4c197", "#e0a36a", "#a76d3b", "#6e4223"];
const HAIR_COLORS = ["#2a1a0f", "#5b3a1a", "#c79a3b", "#bf3b1c", "#d8d8d8", "#1f1f1f"];
const ARMOR_COLORS = [
  ["#8b8680", "#605b55"], // demir
  ["#d4a853", "#8f6f2a"], // altın
  ["#7a2e2e", "#4a1a1a"], // kırmızı
  ["#2e5a7a", "#18384a"], // mavi
  ["#3a7a3e", "#1e4220"], // yeşil
  ["#5a2e7a", "#321543"], // mor
];
const WEAPON_COLORS = ["#d8d8d8", "#b4b4b4", "#d4a853", "#7a2e2e", "#2e5a7a", "#3a7a3e"];

export type GladiatorAvatarProps = {
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  armorTint: number;
  weaponTint: number;
  facing?: "left" | "right";
  size?: number;
  hpPct?: number; // 0-1, düştükçe karakter hafifçe eğilir
  attacking?: boolean;
  hit?: boolean;
};

export default function GladiatorAvatar({
  skinTone,
  hairStyle,
  hairColor,
  armorTint,
  weaponTint,
  facing = "right",
  size = 140,
  hpPct = 1,
  attacking = false,
  hit = false,
}: GladiatorAvatarProps) {
  const skin = SKIN_COLORS[skinTone] || SKIN_COLORS[0];
  const hair = HAIR_COLORS[hairColor] || HAIR_COLORS[0];
  const [armorMain, armorDark] = ARMOR_COLORS[armorTint] || ARMOR_COLORS[0];
  const weapon = WEAPON_COLORS[weaponTint] || WEAPON_COLORS[0];

  // eğilme
  const rotate = (1 - hpPct) * -8 * (facing === "right" ? 1 : -1);
  const attackOffset = attacking ? (facing === "right" ? 8 : -8) : 0;
  const hitOffset = hit ? (facing === "right" ? -6 : 6) : 0;

  const flip = facing === "left" ? "scale(-1,1) translate(-100,0)" : "";

  return (
    <svg viewBox="0 0 100 140" width={size} height={(size * 140) / 100} style={{ display: "block" }}>
      <g transform={`translate(${attackOffset + hitOffset},0) rotate(${rotate} 50 120) ${flip}`}>
        {/* gölge */}
        <ellipse cx="50" cy="132" rx="22" ry="4" fill="#00000040" />

        {/* bacaklar */}
        <rect x="38" y="92" width="10" height="32" rx="3" fill={armorDark} />
        <rect x="52" y="92" width="10" height="32" rx="3" fill={armorDark} />
        <rect x="36" y="122" width="14" height="8" rx="1" fill="#2a1a0f" />
        <rect x="50" y="122" width="14" height="8" rx="1" fill="#2a1a0f" />

        {/* kollar arkaplan */}
        <rect x="22" y="50" width="8" height="28" rx="4" fill={armorMain} />
        <rect x="70" y="50" width="8" height="28" rx="4" fill={armorMain} />

        {/* gövde zırhı */}
        <path
          d="M 30 48 L 70 48 L 72 92 L 28 92 Z"
          fill={armorMain}
          stroke={armorDark}
          strokeWidth="2"
        />
        {/* göğüs çizgileri */}
        <path d="M 50 52 L 50 88" stroke={armorDark} strokeWidth="1.2" opacity="0.6" />
        <path d="M 35 62 L 65 62" stroke={armorDark} strokeWidth="1" opacity="0.4" />

        {/* boyun */}
        <rect x="44" y="40" width="12" height="10" fill={skin} />

        {/* baş */}
        <ellipse cx="50" cy="28" rx="15" ry="17" fill={skin} />

        {/* saç stili */}
        {renderHair(hairStyle, hair)}

        {/* yüz */}
        <circle cx="43" cy="28" r="1.6" fill="#1a1a1a" />
        <circle cx="57" cy="28" r="1.6" fill="#1a1a1a" />
        <path d={hit ? "M 45 37 Q 50 33 55 37" : "M 45 36 Q 50 39 55 36"} stroke="#1a1a1a" strokeWidth="1.2" fill="none" />

        {/* kalkan (sol elde, ön yüz) */}
        <ellipse cx="22" cy="68" rx="8" ry="12" fill={armorMain} stroke={armorDark} strokeWidth="2" />
        <ellipse cx="22" cy="68" rx="3" ry="5" fill={armorDark} />

        {/* silah (sağ elde) */}
        <g transform={`translate(72,${attacking ? 45 : 52}) rotate(${attacking ? -30 : -18})`}>
          {/* kabza */}
          <rect x="-3" y="0" width="6" height="6" fill="#3a2616" />
          {/* namlu */}
          <rect x="-2" y="-28" width="4" height="30" fill={weapon} stroke={armorDark} strokeWidth="1" />
          {/* uç */}
          <polygon points="-2,-28 2,-28 0,-34" fill={weapon} stroke={armorDark} strokeWidth="1" />
        </g>
      </g>
    </svg>
  );
}

function renderHair(style: number, color: string) {
  switch (style) {
    case 1: // kısa
      return (
        <>
          <path d="M 35 22 Q 50 8 65 22 L 65 26 Q 50 18 35 26 Z" fill={color} />
        </>
      );
    case 2: // mohawk
      return (
        <>
          <path d="M 45 22 Q 50 6 55 22 L 55 30 Q 50 27 45 30 Z" fill={color} />
          <rect x="34" y="22" width="32" height="4" fill="#00000020" />
        </>
      );
    case 3: // dağınık
      return (
        <>
          <path d="M 33 22 Q 40 6 50 14 Q 60 6 67 22 L 66 30 Q 62 20 55 24 Q 50 20 45 24 Q 38 20 34 30 Z" fill={color} />
        </>
      );
    case 4: // kel + sakal
      return (
        <>
          <ellipse cx="50" cy="36" rx="14" ry="6" fill={color} />
        </>
      );
    case 0:
    default: // uzun
      return (
        <>
          <path d="M 33 28 Q 33 12 50 10 Q 67 12 67 28 L 66 42 Q 58 28 50 32 Q 42 28 34 42 Z" fill={color} />
        </>
      );
  }
}
