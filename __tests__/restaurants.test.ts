// __tests__/restaurants.test.ts
import { describe, it, expect } from "vitest";
import { filterByCuisine, CUISINE_TYPES } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";

const makeRestaurant = (cuisine: string[]): Restaurant => ({
  id: "r1", name: "Test", description: "", cuisine,
  coverImage: "", logoImage: "", zone: "ifrane", isOpen: true,
  rating: 4.0, reviewCount: 10, deliveryFee: 15, minOrder: 50,
  estimatedDeliveryMins: 30, address: "", coordinates: { lat: 0, lng: 0 },
  tags: [], createdAt: new Date().toISOString(),
});

describe("filterByCuisine", () => {
  it("returns all restaurants when no cuisines selected", () => {
    const list = [makeRestaurant(["moroccan"]), makeRestaurant(["italian"])];
    expect(filterByCuisine(list, [])).toHaveLength(2);
  });

  it("filters to matching cuisine", () => {
    const moroccan = makeRestaurant(["moroccan"]);
    const italian  = makeRestaurant(["italian"]);
    expect(filterByCuisine([moroccan, italian], ["moroccan"])).toEqual([moroccan]);
  });

  it("matches restaurants with multiple cuisines", () => {
    const multi = makeRestaurant(["moroccan", "healthy"]);
    expect(filterByCuisine([multi], ["healthy"])).toEqual([multi]);
  });

  it("returns empty when no match", () => {
    expect(filterByCuisine([makeRestaurant(["moroccan"])], ["italian"])).toHaveLength(0);
  });
});

describe("CUISINE_TYPES", () => {
  it("contains moroccan and italian", () => {
    expect(CUISINE_TYPES).toContain("moroccan");
    expect(CUISINE_TYPES).toContain("italian");
  });
});
