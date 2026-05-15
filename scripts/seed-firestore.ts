/**
 * scripts/seed-firestore.ts
 * Seeds Firestore with the 6 restaurants, 13 dishes, and menus from the
 * Claude Design prototype (atlas-data.jsx).
 *
 * Run:  npx tsx scripts/seed-firestore.ts
 * Env:  .env.local must be loaded (uses NEXT_PUBLIC_FIREBASE_* vars)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  writeBatch,
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);

// ─── Prototype restaurant data (exact from atlas-data.jsx) ────────────────────

const RESTAURANTS = [
  {
    id: "darnaji",
    name: "Dar Naji",
    tagline: "Cuisine marocaine traditionnelle",
    city: "Rabat · Médina",
    zone: "casablanca",
    rating: 4.8,
    reviewCount: 2340,
    eta: "20–30 min",
    estimatedDeliveryMins: 25,
    fee: "12 DH",
    deliveryFee: 12,
    distance: "1.2 km",
    badges: ["Top-rated", "Halal"],
    tileHue: 18,
    img: "rest:darnaji",
    description: "Découvrez la cuisine marocaine authentique préparée selon les recettes traditionnelles de nos grand-mères. Tagines, couscous, pastilla — le goût de la maison.",
    cuisine: ["moroccan"],
    isOpen: true,
    minOrder: 60,
    address: "7 Rue Souika, Médina, Rabat",
    coordinates: { lat: 34.0209, lng: -6.8340 },
    tags: ["halal", "top-rated", "traditional"],
    coverImage: "",
    logoImage: "",
    createdAt: new Date().toISOString(),
    dishes: ["tagine-poulet", "couscous-royal", "pastilla", "harira", "briouates", "atay"],
  },
  {
    id: "cafeclock",
    name: "Café Clock",
    tagline: "Camel burger & comfort food",
    city: "Fès · Médina",
    zone: "casablanca",
    rating: 4.7,
    reviewCount: 1820,
    eta: "25–35 min",
    estimatedDeliveryMins: 30,
    fee: "15 DH",
    deliveryFee: 15,
    distance: "0.8 km",
    badges: ["Beldi"],
    tileHue: 38,
    img: "rest:cafeclock",
    description: "Le légendaire Café Clock vous propose son incontournable camel burger et une cuisine de fusion marocaine créative dans le cœur de la médina de Fès.",
    cuisine: ["moroccan", "fast-food"],
    isOpen: true,
    minOrder: 50,
    address: "7 Derb el Magana, Médina, Fès",
    coordinates: { lat: 34.0640, lng: -4.9738 },
    tags: ["beldi", "burger", "fusion"],
    coverImage: "",
    logoImage: "",
    createdAt: new Date().toISOString(),
    dishes: ["camel-burger", "msemen", "atay", "jus-orange"],
  },
  {
    id: "snacktanjia",
    name: "Snack Tanjia",
    tagline: "Spécialités marrakchies",
    city: "Marrakech · Jemâa",
    zone: "casablanca",
    rating: 4.9,
    reviewCount: 5210,
    eta: "15–25 min",
    estimatedDeliveryMins: 20,
    fee: "9 DH",
    deliveryFee: 9,
    distance: "0.5 km",
    badges: ["Bestseller"],
    tileHue: 6,
    img: "rest:snacktanjia",
    description: "La tanjia, spécialité emblématique de Marrakech, cuite lentement dans la cendre du hammam. Une expérience gastronomique unique, livrée chez vous.",
    cuisine: ["moroccan"],
    isOpen: true,
    minOrder: 40,
    address: "Jemâa el-Fna, Marrakech",
    coordinates: { lat: 31.6260, lng: -7.9891 },
    tags: ["bestseller", "traditional", "marrakchi"],
    coverImage: "",
    logoImage: "",
    createdAt: new Date().toISOString(),
    dishes: ["tanjia", "harira", "chebakia", "atay"],
  },
  {
    id: "atayco",
    name: "Atay & Co",
    tagline: "Thé à la menthe & sucreries",
    city: "Casablanca · Maârif",
    zone: "casablanca",
    rating: 4.6,
    reviewCount: 980,
    eta: "10–15 min",
    estimatedDeliveryMins: 12,
    fee: "7 DH",
    deliveryFee: 7,
    distance: "0.3 km",
    badges: ["Free delivery"],
    tileHue: 150,
    img: "rest:atayco",
    description: "L'art du thé à la menthe marocain dans toute sa splendeur. Accompagné de chebakia, pastilla sucrée et autres douceurs beldi pour un goûter authentique.",
    cuisine: ["moroccan", "desserts"],
    isOpen: true,
    minOrder: 30,
    address: "Rue de la Liberté, Maârif, Casablanca",
    coordinates: { lat: 33.5892, lng: -7.6314 },
    tags: ["free-delivery", "tea", "sweets"],
    coverImage: "",
    logoImage: "",
    createdAt: new Date().toISOString(),
    dishes: ["atay", "chebakia", "msemen", "jus-orange"],
  },
  {
    id: "riadmogador",
    name: "Riad Mogador",
    tagline: "Fine dining marocain",
    city: "Essaouira · Port",
    zone: "casablanca",
    rating: 4.8,
    reviewCount: 1240,
    eta: "30–40 min",
    estimatedDeliveryMins: 35,
    fee: "18 DH",
    deliveryFee: 18,
    distance: "2.1 km",
    badges: ["Premium"],
    tileHue: 200,
    img: "rest:riadmogador",
    description: "Expérience gastronomique haut de gamme dans le cadre enchanteur d'Essaouira. Pastilla, poissons frais du port, et desserts raffinés — une cuisine marocaine d'excellence.",
    cuisine: ["moroccan"],
    isOpen: true,
    minOrder: 120,
    address: "Place Moulay Hassan, Essaouira",
    coordinates: { lat: 31.5125, lng: -9.7749 },
    tags: ["premium", "fine-dining", "seafood"],
    coverImage: "",
    logoImage: "",
    createdAt: new Date().toISOString(),
    dishes: ["pastilla", "tagine-kefta", "briouates", "atay"],
  },
  {
    id: "baladi",
    name: "Baladi Healthy",
    tagline: "Bowls & jus pressés",
    city: "Casablanca · Anfa",
    zone: "casablanca",
    rating: 4.5,
    reviewCount: 612,
    eta: "20–25 min",
    estimatedDeliveryMins: 22,
    fee: "10 DH",
    deliveryFee: 10,
    distance: "1.0 km",
    badges: ["Healthy"],
    tileHue: 130,
    img: "rest:baladi",
    description: "Cuisine saine inspirée des saveurs du terroir marocain. Bowls nutritifs, jus fraîchement pressés et salades généreuses — le beldi dans toute sa légèreté.",
    cuisine: ["moroccan", "healthy"],
    isOpen: true,
    minOrder: 50,
    address: "Boulevard d'Anfa, Casablanca",
    coordinates: { lat: 33.5957, lng: -7.6532 },
    tags: ["healthy", "bowls", "juices"],
    coverImage: "",
    logoImage: "",
    createdAt: new Date().toISOString(),
    dishes: ["bowl-baladi", "jus-orange", "harira", "msemen"],
  },
];

// ─── Prototype dish data (exact from atlas-data.jsx) ──────────────────────────

const DISHES: Record<string, {
  name: string; sub: string; price: number; hue: number; img: string;
  description?: string; tags?: string[];
}> = {
  "tagine-poulet": {
    name: "Tagine Poulet Citron",
    sub: "Olives Beldi · oignons confits",
    description: "Un tagine généreux au poulet fermier confit aux olives beldi et oignons dorés, parfumé au citron confit et aux épices safi. Servi avec khobz traditionnel.",
    price: 68, hue: 38, img: "dish:tagine-poulet",
    tags: ["halal", "traditional", "chicken"],
  },
  "couscous-royal": {
    name: "Couscous Royal",
    sub: "Agneau, poulet, merguez",
    description: "Le grand couscous du vendredi — semoule vapeur, agneau fondant, poulet rôti, merguez maison et sept légumes de saison. Une générosité marocaine dans chaque assiette.",
    price: 95, hue: 24, img: "dish:couscous-royal",
    tags: ["halal", "traditional", "sharing"],
  },
  "pastilla": {
    name: "Pastilla au Poulet",
    sub: "Amandes, cannelle, ouarka",
    description: "La pastilla est la reine des plats marocains — feuilletés de ouarka croustillants, garnis de poulet effiloché aux amandes grillées, cannelle et sucre glace.",
    price: 75, hue: 18, img: "dish:pastilla",
    tags: ["halal", "traditional", "premium"],
  },
  "harira": {
    name: "Harira Traditionnelle",
    sub: "Avec dattes & chebakia",
    description: "La soupe nationale marocaine — tomates, lentilles, pois chiches et coriandre fraîche. Servie avec dattes medjool et chebakia mielleuse selon la tradition.",
    price: 28, hue: 6, img: "dish:harira",
    tags: ["halal", "vegetarian", "traditional"],
  },
  "camel-burger": {
    name: "Camel Burger",
    sub: "Avec frites maison",
    description: "L'iconique burger au chameau du Café Clock — steak haché de dromadaire marocain, fromage de chèvre, ras el hanout, salade et frites beldi maison.",
    price: 110, hue: 38, img: "dish:camel-burger",
    tags: ["halal", "signature", "burger"],
  },
  "msemen": {
    name: "Msemen au Miel",
    sub: "3 pièces · miel & beurre",
    description: "Galettes feuilletées maison, cuites à la poêle et servies chaudes avec beurre fermier et miel d'argan. La crêpe marocaine dans toute sa simplicité gourmande.",
    price: 22, hue: 50, img: "dish:msemen",
    tags: ["vegetarian", "breakfast", "traditional"],
  },
  "atay": {
    name: "Atay à la Menthe",
    sub: "Théière de 4 verres",
    description: "Le thé cérémonial marocain — gunpowder vert infusé à la menthe fraîche du Marché, sucré selon la tradition et versé en hauteur pour créer la mousse caractéristique.",
    price: 18, hue: 150, img: "dish:atay",
    tags: ["vegetarian", "beverage", "traditional"],
  },
  "tanjia": {
    name: "Tanjia Marrakchia",
    sub: "Cuite au four traditionnel",
    description: "La spécialité marrakchie par excellence — agneau mijoté pendant 6h dans une jarre en terre cuite avec smen, citron confit, cumin et safran de Taliouine.",
    price: 88, hue: 18, img: "dish:tanjia",
    tags: ["halal", "signature", "slow-cooked"],
  },
  "tagine-kefta": {
    name: "Tagine Kefta & Œuf",
    sub: "Sauce tomate épicée",
    description: "Boulettes de viande hachée épicées nappées d'une sauce tomate fraîche au cumin et paprika, avec œufs mollets cassés dedans. Un classique réconfortant.",
    price: 58, hue: 6, img: "dish:tagine-kefta",
    tags: ["halal", "traditional"],
  },
  "briouates": {
    name: "Briouates Crevettes",
    sub: "6 pièces croustillantes",
    description: "Petits triangles de ouarka dorés à l'huile d'argan, fourrés de crevettes royales à la chermoula, coriandre et gingembre frais. Croustillants à souhait.",
    price: 45, hue: 38, img: "dish:briouates",
    tags: ["halal", "seafood", "starter"],
  },
  "chebakia": {
    name: "Chebakia au Miel",
    sub: "Pâtisserie marocaine · 250g",
    description: "La pâtisserie du Ramadan par excellence — fleurs de pâte frites enrobées de miel de fleurs et parsemées de graines de sésame. Un délice sucré à partager.",
    price: 35, hue: 340, img: "dish:chebakia",
    tags: ["vegetarian", "dessert", "traditional"],
  },
  "bowl-baladi": {
    name: "Bowl Baladi",
    sub: "Quinoa, avocat, grenade",
    description: "Le bowl healthy façon marocaine — quinoa bio, avocat, grenade, houmous maison, zaâlouk d'aubergine et citron confit. Nourrissant et plein de saveurs du terroir.",
    price: 72, hue: 130, img: "dish:bowl-baladi",
    tags: ["vegetarian", "healthy", "gluten-free"],
  },
  "jus-orange": {
    name: "Jus d'Orange Frais",
    sub: "Pressé minute",
    description: "Les meilleures oranges de Berkane pressées minute devant vous. Vitaminé, sucré naturellement — le jus de rue marocain dans toute sa fraîcheur.",
    price: 16, hue: 50, img: "dish:jus-orange",
    tags: ["vegetarian", "beverage", "fresh"],
  },
};

// ─── Menu categories per restaurant ──────────────────────────────────────────

const CATEGORIES: Record<string, { name: string; dishes: string[] }[]> = {
  darnaji: [
    { name: "Populaires", dishes: ["tagine-poulet", "pastilla", "harira"] },
    { name: "Tagines", dishes: ["tagine-poulet", "tagine-kefta"] },
    { name: "Couscous", dishes: ["couscous-royal"] },
    { name: "Entrées", dishes: ["briouates", "harira"] },
    { name: "Pâtisseries", dishes: ["chebakia"] },
    { name: "Boissons", dishes: ["atay", "jus-orange"] },
  ],
  cafeclock: [
    { name: "Populaires", dishes: ["camel-burger", "atay"] },
    { name: "Burgers", dishes: ["camel-burger"] },
    { name: "Snacks", dishes: ["msemen", "briouates"] },
    { name: "Boissons", dishes: ["atay", "jus-orange"] },
  ],
  snacktanjia: [
    { name: "Populaires", dishes: ["tanjia", "harira"] },
    { name: "Spécialités", dishes: ["tanjia"] },
    { name: "Entrées", dishes: ["harira"] },
    { name: "Pâtisseries", dishes: ["chebakia"] },
    { name: "Boissons", dishes: ["atay"] },
  ],
  atayco: [
    { name: "Populaires", dishes: ["atay", "chebakia"] },
    { name: "Thés", dishes: ["atay"] },
    { name: "Pâtisseries", dishes: ["chebakia", "msemen"] },
    { name: "Boissons", dishes: ["jus-orange"] },
  ],
  riadmogador: [
    { name: "Populaires", dishes: ["pastilla", "tagine-kefta"] },
    { name: "Entrées", dishes: ["briouates", "harira"] },
    { name: "Plats", dishes: ["pastilla", "tagine-kefta"] },
    { name: "Boissons", dishes: ["atay"] },
  ],
  baladi: [
    { name: "Populaires", dishes: ["bowl-baladi", "jus-orange"] },
    { name: "Bowls", dishes: ["bowl-baladi"] },
    { name: "Soupes", dishes: ["harira"] },
    { name: "Snacks", dishes: ["msemen"] },
    { name: "Boissons", dishes: ["jus-orange", "atay"] },
  ],
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function authenticate() {
  const auth = getAuth(app);
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;
  if (email && password) {
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`🔐 Signed in as ${email}`);
    return;
  }
  try {
    await signInAnonymously(auth);
    console.log("🔐 Signed in anonymously");
  } catch {
    console.log("ℹ️  No auth available — running unauthenticated (seed-mode rules required)");
  }
}

async function seed() {
  console.log("🌱 Seeding Firestore with prototype data...\n");
  await authenticate();

  for (const rest of RESTAURANTS) {
    const { dishes, ...restData } = rest;

    // Write restaurant doc
    await setDoc(doc(db, "restaurants", rest.id), restData);
    console.log(`✅ Restaurant: ${rest.name}`);

    // Write menu categories + items
    const cats = CATEGORIES[rest.id] ?? [];
    for (let catIdx = 0; catIdx < cats.length; catIdx++) {
      const cat = cats[catIdx];
      const catId = cat.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const catRef = doc(db, "restaurants", rest.id, "categories", catId);

      await setDoc(catRef, {
        name: cat.name,
        sortOrder: catIdx,
      });

      const batch = writeBatch(db);
      cat.dishes.forEach((dishKey, itemIdx) => {
        const dish = DISHES[dishKey];
        if (!dish) return;
        const itemRef = doc(
          db,
          "restaurants", rest.id,
          "categories", catId,
          "items", dishKey
        );
        batch.set(itemRef, {
          name: dish.name,
          description: dish.description ?? dish.sub,
          price: dish.price,
          image: dish.img,          // sprite id
          available: true,
          tags: dish.tags ?? [],
          sortOrder: itemIdx,
          categoryId: catId,
        });
      });
      await batch.commit();
    }
    console.log(`   └─ ${cats.length} categories seeded`);
  }

  console.log("\n🎉 Seed complete! 6 restaurants, 13 dishes seeded.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
