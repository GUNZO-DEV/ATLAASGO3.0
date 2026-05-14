import { isSurge, calculateSurgeFee } from "@/lib/pricing";

describe("isSurge", () => {
  it("triggers when demand/supply > 2", () => {
    expect(isSurge(5, 2)).toBe(true); // ratio = 2.5
  });
  it("does not trigger when ratio ≤ 2", () => {
    expect(isSurge(4, 2)).toBe(false); // ratio = 2.0
  });
  it("does not trigger with zero drivers online", () => {
    expect(isSurge(5, 0)).toBe(false);
  });
});

describe("calculateSurgeFee", () => {
  it("applies surge multiplier when surging", () => {
    // ifrane base = 15, multiplier = 1.5 → 22.5
    const fee = calculateSurgeFee("ifrane", 5, 2);
    expect(fee).toBe(22.5);
  });
  it("returns base fee when not surging", () => {
    const fee = calculateSurgeFee("ifrane", 2, 2);
    expect(fee).toBe(15);
  });
});
