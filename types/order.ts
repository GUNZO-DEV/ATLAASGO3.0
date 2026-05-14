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

/** At least one of `itemId` or `name` should be present. All fields optional for legacy compat. */
export interface OrderItem {
  description?: string; // legacy field — kept for backward compat
  itemId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  note?: string;
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
  // Multi-restaurant fields (present on orders placed via /restaurants flow)
  restaurantId?: string;
  restaurantName?: string;
  cartId?: string;
  deliveryAddress?: string;
  deliveryAddressNote?: string;
  orderNote?: string;
  scheduledFor?: string; // ISO timestamp; absent = ASAP
  subtotal?: number;
  total?: number;
}
