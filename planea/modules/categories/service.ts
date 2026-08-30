import { db } from "@/lib/db";

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
}

/** Categorías disponibles para el usuario: del sistema + personalizadas. */
export async function listCategories(userId: string): Promise<CategoryDTO[]> {
  const categories = await db.category.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      color: true,
      isSystem: true,
    },
  });
  // "Otros" al final
  return categories.sort((a, b) =>
    a.slug === "otros" ? 1 : b.slug === "otros" ? -1 : 0,
  );
}
