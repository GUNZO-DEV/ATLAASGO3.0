import type { Restaurant, MenuCategory, MenuItem } from "@/types/restaurant";

export const CUISINE_TYPES = [
  "moroccan", "italian", "chinese", "fast-food", "healthy", "desserts", "other",
] as const;
export type CuisineType = (typeof CUISINE_TYPES)[number];

/** Pure filter — used by RestaurantGrid and tests. */
export function filterByCuisine(restaurants: Restaurant[], cuisines: string[]): Restaurant[] {
  if (cuisines.length === 0) return restaurants;
  return restaurants.filter((r) => r.cuisine.some((c) => cuisines.includes(c)));
}

export async function getRestaurants(zone: string): Promise<Restaurant[]> {
  const { collection, getDocs, query, where, orderBy } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const snap = await getDocs(
    query(collection(db, "restaurants"), where("zone", "==", zone), orderBy("rating", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Restaurant));
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const { doc, getDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const snap = await getDoc(doc(db, "restaurants", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Restaurant;
}

export async function getMenu(
  restaurantId: string
): Promise<{ category: MenuCategory; items: MenuItem[] }[]> {
  const { collection, getDocs, query, orderBy, where } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const catsSnap = await getDocs(
    query(
      collection(db, "restaurants", restaurantId, "categories"),
      orderBy("sortOrder")
    )
  );

  const result = await Promise.all(
    catsSnap.docs.map(async (catDoc) => {
      const category = { id: catDoc.id, ...catDoc.data() } as MenuCategory;
      const itemsSnap = await getDocs(
        query(
          collection(db, "restaurants", restaurantId, "categories", catDoc.id, "items"),
          where("available", "==", true),
          orderBy("sortOrder")
        )
      );
      const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
      return { category, items };
    })
  );

  return result;
}
