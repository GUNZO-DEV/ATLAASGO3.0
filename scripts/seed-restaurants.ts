// scripts/seed-restaurants.ts
// Run once: npx tsx scripts/seed-restaurants.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app =
  getApps().length === 0
    ? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      })
    : getApps()[0];

const db = getFirestore(app);

const RESTAURANTS = [
  {
    name: "Al Karam",
    description: "Traditional Moroccan cuisine in the heart of Ifrane",
    cuisine: ["moroccan"],
    coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    logoImage: "",
    zone: "ifrane",
    isOpen: true,
    rating: 4.5,
    reviewCount: 124,
    deliveryFee: 15,
    minOrder: 40,
    estimatedDeliveryMins: 25,
    address: "Avenue Hassan II, Ifrane",
    coordinates: { lat: 33.5228, lng: -5.1128 },
    tags: ["popular", "top-rated"],
    createdAt: new Date().toISOString(),
    menu: [
      {
        category: { name: "Starters", sortOrder: 1 },
        items: [
          { name: "Harira Soup", description: "Traditional Moroccan tomato and lentil soup", price: 20, image: "", available: true, tags: ["vegetarian"], sortOrder: 1 },
          { name: "Zaalouk", description: "Grilled eggplant and tomato salad", price: 18, image: "", available: true, tags: ["vegetarian"], sortOrder: 2 },
        ],
      },
      {
        category: { name: "Mains", sortOrder: 2 },
        items: [
          { name: "Chicken Tagine", description: "Slow-cooked chicken with olives and preserved lemon", price: 75, image: "", available: true, tags: ["popular"], sortOrder: 1 },
          { name: "Lamb Couscous", description: "Slow-cooked lamb over fluffy couscous", price: 85, image: "", available: true, tags: [], sortOrder: 2 },
          { name: "Kefta Plate", description: "Spiced minced meat skewers with fries and salad", price: 55, image: "", available: true, tags: ["popular"], sortOrder: 3 },
        ],
      },
      {
        category: { name: "Drinks", sortOrder: 3 },
        items: [
          { name: "Mint Tea", description: "Moroccan sweet mint tea", price: 10, image: "", available: true, tags: [], sortOrder: 1 },
          { name: "Fresh Orange Juice", description: "Squeezed to order", price: 15, image: "", available: true, tags: [], sortOrder: 2 },
        ],
      },
    ],
  },
  {
    name: "Campus Burger",
    description: "Burgers, wraps and loaded fries — AUI student favourite",
    cuisine: ["fast-food"],
    coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    logoImage: "",
    zone: "ifrane",
    isOpen: true,
    rating: 4.2,
    reviewCount: 87,
    deliveryFee: 10,
    minOrder: 30,
    estimatedDeliveryMins: 20,
    address: "Near AUI Main Gate, Ifrane",
    coordinates: { lat: 33.521, lng: -5.1098 },
    tags: ["new"],
    createdAt: new Date().toISOString(),
    menu: [
      {
        category: { name: "Burgers", sortOrder: 1 },
        items: [
          { name: "Classic Burger", description: "Beef patty, cheddar, lettuce, tomato, pickles", price: 45, image: "", available: true, tags: ["popular"], sortOrder: 1 },
          { name: "Crispy Chicken Burger", description: "Fried chicken fillet, coleslaw, spicy mayo", price: 40, image: "", available: true, tags: [], sortOrder: 2 },
          { name: "Double Smash", description: "Two smashed beef patties, special sauce, caramelised onions", price: 60, image: "", available: true, tags: ["popular"], sortOrder: 3 },
        ],
      },
      {
        category: { name: "Sides", sortOrder: 2 },
        items: [
          { name: "Loaded Fries", description: "Crispy fries with cheese sauce and jalapeños", price: 25, image: "", available: true, tags: [], sortOrder: 1 },
          { name: "Onion Rings", description: "Beer-battered onion rings, 8 pcs", price: 20, image: "", available: true, tags: [], sortOrder: 2 },
        ],
      },
      {
        category: { name: "Drinks", sortOrder: 3 },
        items: [
          { name: "Soft Drink", description: "Coca-Cola, Sprite, or Fanta", price: 10, image: "", available: true, tags: [], sortOrder: 1 },
          { name: "Milkshake", description: "Vanilla, chocolate, or strawberry", price: 28, image: "", available: true, tags: ["popular"], sortOrder: 2 },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding restaurants...");
  for (const r of RESTAURANTS) {
    const { menu, ...restaurantData } = r;
    const restaurantRef = await addDoc(collection(db, "restaurants"), restaurantData);
    console.log(`✓ ${restaurantData.name} (${restaurantRef.id})`);
    for (const { category, items } of menu) {
      const catRef = await addDoc(
        collection(db, "restaurants", restaurantRef.id, "categories"),
        category
      );
      for (const item of items) {
        await addDoc(
          collection(db, "restaurants", restaurantRef.id, "categories", catRef.id, "items"),
          item
        );
      }
      console.log(`  ✓ ${category.name} (${items.length} items)`);
    }
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
