// Çaylak entry gizliliği — yalnızca MOD/CO_MOD/ADMIN çaylak entry'lerini görür.
// Yazarın kendi entry'si her zaman görünür (yazar kendi yazdığını görebilsin).

const PRIVILEGED_ROLES = new Set(["MODERATOR", "CO_MOD", "ADMIN"]);

type Viewer = { id?: string; role?: string | null } | null | undefined;

export function canSeeCaylak(viewer: Viewer): boolean {
  return !!viewer?.role && PRIVILEGED_ROLES.has(viewer.role);
}

/**
 * Prisma Entry.where için çaylak filtresi üretir.
 * - Yetkili roller: filtre yok
 * - Giriş yapanlar: çaylak entry'si gizli, kendi entry'si görünür
 * - Anonim ziyaretçi: çaylak entry'si tamamen gizli
 */
export function caylakEntryWhere(viewer: Viewer) {
  if (canSeeCaylak(viewer)) return {};
  const orClause: Array<Record<string, unknown>> = [
    { author: { is: { role: { not: "CAYLAK" as const } } } },
  ];
  if (viewer?.id) {
    orClause.push({ authorId: viewer.id });
  }
  return { OR: orClause };
}

export { PRIVILEGED_ROLES };
