import { isValidTransition, buildHistoryEntry } from "@/lib/orders";
import type { OrderStatus } from "@/types/order";

describe("isValidTransition", () => {
  it("allows pending → accepted", () => {
    expect(isValidTransition("pending", "accepted")).toBe(true);
  });
  it("allows accepted → picked_up", () => {
    expect(isValidTransition("accepted", "picked_up")).toBe(true);
  });
  it("allows picked_up → delivered", () => {
    expect(isValidTransition("picked_up", "delivered")).toBe(true);
  });
  it("allows pending → cancelled", () => {
    expect(isValidTransition("pending", "cancelled")).toBe(true);
  });
  it("allows accepted → cancelled", () => {
    expect(isValidTransition("accepted", "cancelled")).toBe(true);
  });
  it("allows pending → expired", () => {
    expect(isValidTransition("pending", "expired")).toBe(true);
  });
  it("rejects delivered → pending", () => {
    expect(isValidTransition("delivered", "pending")).toBe(false);
  });
  it("rejects accepted → pending", () => {
    expect(isValidTransition("accepted", "pending")).toBe(false);
  });
  it("rejects delivered → cancelled", () => {
    expect(isValidTransition("delivered", "cancelled")).toBe(false);
  });
});

describe("buildHistoryEntry", () => {
  it("returns entry with correct status and actorId", () => {
    const entry = buildHistoryEntry("accepted", "user123");
    expect(entry.status).toBe("accepted");
    expect(entry.actorId).toBe("user123");
    expect(typeof entry.timestamp).toBe("string");
  });
});
