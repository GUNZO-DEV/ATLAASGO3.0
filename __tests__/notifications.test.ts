import { buildWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/notifications";

describe("buildWhatsAppMessage", () => {
  it("builds driver_accepted message", () => {
    const msg = buildWhatsAppMessage("driver_accepted", { driverName: "Hassan" });
    expect(msg).toContain("Hassan");
    expect(msg).toContain("AtlaasGo");
  });

  it("builds order_delivered message", () => {
    const msg = buildWhatsAppMessage("order_delivered", {});
    expect(msg).toContain("delivered");
  });

  it("throws for unknown template", () => {
    // @ts-expect-error testing unknown key
    expect(() => buildWhatsAppMessage("unknown_event", {})).toThrow();
  });
});

describe("WHATSAPP_TEMPLATES", () => {
  it("has all required template keys", () => {
    expect(WHATSAPP_TEMPLATES).toHaveProperty("driver_accepted");
    expect(WHATSAPP_TEMPLATES).toHaveProperty("driver_picked_up");
    expect(WHATSAPP_TEMPLATES).toHaveProperty("order_delivered");
  });
});
