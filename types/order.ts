export type OrderStatus = "pending" | "assigned" | "picked_up" | "delivered" | "cancelled";

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
  timestamp: string;
}
