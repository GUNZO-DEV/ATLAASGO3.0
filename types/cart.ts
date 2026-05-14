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
  participantNames: Record<string, string>; // uid -> display name
  items: CartItem[];
  status: "active" | "checked_out";
  createdAt: string;
  updatedAt: string;
}
