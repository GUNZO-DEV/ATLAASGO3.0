import { describe, it, expect } from "vitest";
import { getCartSubtotal, getCartItemCount } from "@/lib/cart";
import type { CartItem } from "@/types/cart";

const makeItem = (price: number, quantity: number): CartItem => ({
  itemId: "i1",
  name: "Item",
  price,
  quantity,
  addedBy: "uid1",
});

describe("getCartSubtotal", () => {
  it("returns 0 for empty cart", () => {
    expect(getCartSubtotal([])).toBe(0);
  });

  it("sums price × quantity for each item", () => {
    expect(getCartSubtotal([makeItem(30, 2), makeItem(20, 1)])).toBe(80);
  });
});

describe("getCartItemCount", () => {
  it("returns 0 for empty cart", () => {
    expect(getCartItemCount([])).toBe(0);
  });

  it("sums quantities", () => {
    expect(getCartItemCount([makeItem(10, 3), makeItem(10, 2)])).toBe(5);
  });
});
