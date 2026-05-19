import type { GeoPoint, Timestamp } from 'firebase/firestore';

export type CategoryKey = 'food' | 'pharmacy' | 'groceries';

export type Category = {
  id: CategoryKey;
  label: string;
  tagline: string;
  emoji: string;
  gradient: [string, string];
  partnerCount: number;
};

export const ORDER_STAGES = ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'] as const;
export type OrderStage = (typeof ORDER_STAGES)[number];

/**
 * Driver-side header view. Mirrored fields on the order doc keep the driver
 * read path single-document — no joins needed in the dispatch app.
 */
export type DriverPayload = {
  headerLandmark: string;
  coords: GeoPoint;
  deliveryNotes?: string;
};

export type Order = {
  id: string;
  customerId: string;
  category: CategoryKey;
  status: OrderStage;
  createdAt: Timestamp;
  /** GPS captured at checkout from expo-location. */
  coords: { lat: number; lng: number; accuracyM?: number };
  /** Mandatory free-text landmark (Moroccan-style location reference). */
  landmark: string;
  /** Mirrored data optimised for the driver app's assignment header. */
  driverPayload: DriverPayload;
  totalDh: number;
};

export type NewOrderInput = Omit<Order, 'id' | 'createdAt' | 'status' | 'driverPayload'> & {
  deliveryNotes?: string;
};
