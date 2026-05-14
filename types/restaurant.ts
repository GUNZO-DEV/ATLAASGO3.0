export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  coverImage: string;
  logoImage: string;
  zone: string;
  isOpen: boolean;
  rating: number;
  reviewCount: number;
  deliveryFee: number;
  minOrder: number;
  estimatedDeliveryMins: number;
  address: string;
  coordinates: { lat: number; lng: number };
  tags: string[];
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  tags: string[];
  sortOrder: number;
}
