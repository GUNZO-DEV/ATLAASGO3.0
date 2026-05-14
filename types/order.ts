export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "expired";

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string; // ISO string
  actorId: string;
}

export interface OrderItem {
  description: string;
}

export interface Order {
  id?: string;
  customerId: string;
  driverId?: string;
  items: OrderItem[];
  pickup?: string;
  dropoff?: string;
  phone?: string;
  status: OrderStatus;
  zone: string;
  fee?: number;        // stored at creation; may be absent on legacy orders
  surgeFee?: number;
  statusHistory?: StatusHistoryEntry[];
  timestamp: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}
