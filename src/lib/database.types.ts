/**
 * Hand-maintained mirror of the Supabase schema in `supabase/schema.sql`.
 * Regenerate with `npx supabase gen types typescript --project-id <id>` once
 * the Supabase CLI is wired into the project.
 *
 * Covers the 38 tables of the AtlaasGo data model. Only the most frequently
 * queried shapes are exported; the rest are reachable through `Tables<…>`.
 */

// ─── Enums ─────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'ordered'
  | 'preparing'
  | 'enRoute'
  | 'outForDelivery'
  | 'arriving'
  | 'delivered'
  | 'cancelled';

export type AppRole = 'customer' | 'merchant' | 'rider' | 'admin' | 'super_admin';

export type RestaurantStatus = 'draft' | 'pending' | 'live' | 'paused' | 'rejected';

export type FavoriteKind = 'restaurant' | 'menu_item';

export type WalletTxKind =
  | 'topup'
  | 'order_payment'
  | 'refund'
  | 'referral_bonus'
  | 'adjustment';

export type PrimeTier = 'student' | 'standard' | 'campus_pass';

export type NotificationKind =
  | 'order_status'
  | 'chat_message'
  | 'promo'
  | 'system'
  | 'rider_assignment'
  | 'review_request'
  | 'wallet';

export type RiderStatus = 'offline' | 'online' | 'busy' | 'on_break';

export type MessageKind = 'text' | 'quick_reply' | 'location' | 'system';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'no_show'
  | 'cancelled'
  | 'completed';

export type KitchenStatus = 'queued' | 'in_progress' | 'ready' | 'served' | 'cancelled';

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'host' | 'server';

export type IncidentSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ApplicationStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'needs_info';

export type PromoKind = 'percent_off' | 'flat_off' | 'free_delivery' | 'bogo';

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

export type OrderGroupStatus = 'open' | 'locked' | 'submitted' | 'cancelled';

// ─── Shared shapes ─────────────────────────────────────────────────────
export type Coords = { lat: number; lng: number; accuracyM?: number | null };

export type DriverPayload = {
  headerLandmark: string;
  coords: Coords;
  deliveryNotes?: string | null;
};

export type CartItemSnapshot = {
  id: string;
  restaurantSlug: string;
  restaurantName: string;
  name: string;
  priceDh: number;
  qty: number;
};

// ─── Row shapes (frequently queried) ───────────────────────────────────
export type ProfileRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
};

export type UserRoleRow = {
  user_id: string;
  role: AppRole;
  granted_at: string;
};

export type RestaurantRow = {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  cuisine_tags: string[];
  description: string | null;
  emoji: string | null;
  img_variant: number;
  rating: number;
  time_min: number;
  fee_dh: number;
  tag: string | null;
  status: RestaurantStatus;
  owner_id: string | null;
  coords: Coords | null;
  is_campus_partner: boolean;
  is_local_legend: boolean;
  whatsapp_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuCategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type MenuItemRow = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_dh: number;
  available: boolean;
  image_url: string | null;
  sort_order: number;
  popularity: number;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  customer_id: string;
  items: CartItemSnapshot[];
  status: OrderStatus;
  landmark: string;
  coords: Coords;
  driver_payload: DriverPayload;
  subtotal_dh: number;
  delivery_fee_dh: number;
  service_fee_dh: number;
  total_dh: number;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
  // Extended (added in subsequent migrations)
  restaurant_id: string | null;
  address_id: string | null;
  scheduled_for: string | null;
  is_campus: boolean;
  campus_building: string | null;
  campus_room: string | null;
  group_id: string | null;
  promotion_code: string | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  table_id: string | null;
};

export type AddressRow = {
  id: string;
  user_id: string;
  label: string;
  line1: string;
  building: string | null;
  room: string | null;
  coords: Coords;
  landmark: string | null;
  is_default: boolean;
  is_campus: boolean;
  created_at: string;
};

export type FavoriteRow = {
  user_id: string;
  kind: FavoriteKind;
  target_id: string;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  order_id: string;
  customer_id: string;
  restaurant_id: string | null;
  rider_id: string | null;
  rating_restaurant: number | null;
  rating_rider: number | null;
  comment: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type WalletRow = {
  user_id: string;
  balance_dh: number;
  currency: string;
  updated_at: string;
};

export type OrderMessageRow = {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: AppRole;
  kind: MessageKind;
  body: string | null;
  location_lat: number | null;
  location_lng: number | null;
  read_at: string | null;
  created_at: string;
};

export type OrderAssignmentRow = {
  id: string;
  order_id: string;
  rider_id: string;
  assigned_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  reject_reason: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  is_active: boolean;
};

export type PromotionRow = {
  code: string;
  kind: PromoKind;
  description: string | null;
  percent_off: number | null;
  flat_off_dh: number | null;
  min_subtotal_dh: number;
  max_redemptions: number | null;
  redemptions: number;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};
