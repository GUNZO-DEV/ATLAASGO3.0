import { describe, it, expect } from "vitest";
import { generateReferralCode } from "@/lib/referral";
import { calculateRollingAverage } from "@/lib/reviews";

describe("generateReferralCode", () => {
  it("returns a 6-character string", () => {
    expect(generateReferralCode()).toHaveLength(6);
  });

  it("returns only uppercase alphanumeric characters", () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("generates unique codes on repeated calls", () => {
    const codes = new Set(Array.from({ length: 100 }, generateReferralCode));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("calculateRollingAverage", () => {
  it("returns newRating when count is 0", () => {
    expect(calculateRollingAverage(0, 0, 5)).toBe(5);
  });

  it("averages correctly", () => {
    // existing avg=4, count=1, new rating=2 → (4*1+2)/2 = 3
    expect(calculateRollingAverage(4, 1, 2)).toBe(3);
  });

  it("handles many reviews", () => {
    // avg=3, count=10, new=5 → (30+5)/11 ≈ 3.18
    expect(calculateRollingAverage(3, 10, 5)).toBeCloseTo(3.18, 1);
  });
});
