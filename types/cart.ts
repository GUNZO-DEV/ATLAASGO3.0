export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  addedBy: string; // Firebase Auth uid
  note?: string;
}

export interface Cart {
  id: string;
  restaurantId: string;
  restaurantName: string;
  ownerId: string;
  participants: string[];
  /** uid -> display name. Every uid in participants[] has an entry here. */
  participantNames: Record<string, string>;
  items: CartItem[];
  status: "active" | "checked_out";
  createdAt: string;
  updatedAt: string;
}
