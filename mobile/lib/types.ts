/**
 * Mobile order types — aligned to the Supabase `orders` table (snake_case in
 * the DB; we expose a camelCase view to the screens via mappers in the hooks).
 */

export type CategoryKey = 'food' | 'pharmacy' | 'groceries';

export type Category = {
  id: CategoryKey;
  label: string;
  tagline: string;
  emoji: string;
  gradient: [string, string];
  partnerCount: number;
  /** Distinctive personality, used when the category is focused. */
  accent: string;        // solo accent color (buttons, highlights)
  soft: string;          // soft tinted background for the focused screen
  headline: string;      // focused-mode hero headline
  voice: string;         // focused-mode sub-line / personality blurb
  sectionTitle: string;  // label above the list when focused
};

// The Supabase order_status enum (matches the web app + DB).
export const ORDER_STAGES = ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'] as const;
export type OrderStage = (typeof ORDER_STAGES)[number];
// Terminal states exist in the DB enum too, but the timeline only animates the above.
export type OrderStatus = OrderStage | 'delivered' | 'cancelled';

export type Coords = { lat: number; lng: number; accuracyM?: number };

export type DriverPayload = {
  headerLandmark: string;
  coords: Coords;
  deliveryNotes?: string | null;
};

/** Camel-cased order as the screens consume it (mapped from the DB row). */
export type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  createdAt: string; // ISO timestamp from Postgres
  coords: Coords;
  landmark: string;
  driverPayload: DriverPayload;
  totalDh: number;
  /** Optional — DB has no single category column; kept for UI compatibility. */
  category?: CategoryKey;
};

export type NewOrderInput = {
  customerId: string;
  category?: CategoryKey;
  coords: Coords;
  landmark: string;
  totalDh: number;
  deliveryNotes?: string;
};

/** Raw Supabase row shape (snake_case) → mapped to Order by mapOrderRow(). */
export type OrderRow = {
  id: string;
  customer_id: string;
  status: OrderStatus;
  created_at: string;
  coords: Coords | null;
  landmark: string | null;
  driver_payload: DriverPayload | null;
  total_dh: number | null;
};

export function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
    createdAt: row.created_at,
    coords: row.coords ?? { lat: 0, lng: 0 },
    landmark: row.landmark ?? '',
    driverPayload:
      row.driver_payload ?? {
        headerLandmark: row.landmark ?? '',
        coords: row.coords ?? { lat: 0, lng: 0 },
      },
    totalDh: row.total_dh ?? 0,
  };
}
