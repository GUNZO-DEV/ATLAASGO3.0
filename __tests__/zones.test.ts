import { ZONE_CONFIGS, getZoneConfig } from "@/constants/zones";

describe("zones", () => {
  it("returns ifrane config", () => {
    const z = getZoneConfig("ifrane");
    expect(z.baseFee).toBe(15);
    expect(z.surgeMultiplier).toBeGreaterThan(1);
    expect(z.active).toBe(true);
  });

  it("returns oujda config", () => {
    const z = getZoneConfig("oujda");
    expect(z.baseFee).toBe(10);
  });

  it("throws for unknown zone", () => {
    expect(() => getZoneConfig("rabat")).toThrow("Unknown zone");
  });

  it("all active zones have centerLat defined", () => {
    Object.values(ZONE_CONFIGS)
      .filter((z) => z.active)
      .forEach((z) => expect(z.centerLat).toBeDefined());
  });
});
