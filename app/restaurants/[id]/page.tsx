// app/restaurants/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Clock, ChevronLeft } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRestaurant, getMenu } from "@/lib/restaurants";
import MenuCategoryNav from "@/components/MenuCategoryNav";
import MenuSection from "@/components/MenuSection";
import CartSidebar from "@/components/CartSidebar";
import { useCart } from "@/contexts/CartContext";
import toast from "react-hot-toast";
import type { Restaurant, MenuCategory, MenuItem } from "@/types/restaurant";
import type { CartItem } from "@/types/cart";

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu]             = useState<{ category: MenuCategory; items: MenuItem[] }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Clear-cart confirmation modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [pendingItem, setPendingItem]       = useState<{
    restaurantId: string;
    restaurantName: string;
    item: Omit<CartItem, "quantity" | "addedBy">;
  } | null>(null);

  const { addItem, cart, clearCart } = useCart();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    Promise.all([getRestaurant(id), getMenu(id)]).then(([r, m]) => {
      setRestaurant(r);
      setMenu(m);
      if (m.length > 0) setActiveCategory(m[0].category.id);
      setLoading(false);
    });
  }, [id]);

  const handleAdd = async (item: MenuItem) => {
    if (!restaurant) return;
    const cartItem = { itemId: item.id, name: item.name, price: item.price };

    if (cart && cart.restaurantId !== restaurant.id) {
      setPendingItem({ restaurantId: restaurant.id, restaurantName: restaurant.name, item: cartItem });
      setShowClearModal(true);
      return;
    }

    try {
      await addItem(restaurant.id, restaurant.name, cartItem);
      toast.success(`${item.name} added`);
    } catch {
      toast.error("Failed to add item");
    }
  };

  const confirmClear = async () => {
    if (!pendingItem) return;
    clearCart();
    setShowClearModal(false);
    setTimeout(async () => {
      try {
        await addItem(pendingItem.restaurantId, pendingItem.restaurantName, pendingItem.item);
        toast.success("Item added");
      } catch {
        toast.error("Failed to add item");
      }
      setPendingItem(null);
    }, 150);
  };

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24 lg:pb-8">
      {/* Hero */}
      <div className="relative h-52 bg-cream-2">
        {restaurant.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link
          href="/restaurants"
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow"
        >
          <ChevronLeft className="w-5 h-5 text-navy" />
        </Link>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] font-[family-name:var(--font-display)] text-white">{restaurant.name}</h1>
          <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {restaurant.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {restaurant.estimatedDeliveryMins} min
            </span>
            <span>
              {restaurant.deliveryFee === 0
                ? "Free delivery"
                : `${restaurant.deliveryFee} MAD delivery`}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky category nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-line shadow-sm px-4 py-3">
        <MenuCategoryNav
          categories={menu.map((m) => m.category)}
          activeCategory={activeCategory}
          onSelect={(catId) => {
            setActiveCategory(catId);
            document
              .getElementById(`cat-${catId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>

      {/* Main content + sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">
        <div className="space-y-10">
          {menu.map(({ category, items }) => (
            <MenuSection
              key={category.id}
              category={category}
              items={items}
              onAdd={handleAdd}
            />
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <CartSidebar />
          </div>
        </div>
      </div>

      {/* Mobile sticky cart bar */}
      {cart && cart.items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-line shadow-lg z-30">
          <Link
            href="/checkout"
            className="flex items-center justify-between bg-brand text-white px-4 py-3 rounded-xl font-semibold text-sm"
          >
            <span className="bg-brand-dark text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cart.items.reduce((s, i) => s + i.quantity, 0)}
            </span>
            <span>View cart</span>
            <span>{cart.items.reduce((s, i) => s + i.price * i.quantity, 0)} MAD</span>
          </Link>
        </div>
      )}

      {/* Clear cart modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-navy mb-2">Start a new cart?</h3>
            <p className="text-sm text-navy-soft mb-5">
              You have items from <strong>{cart?.restaurantName}</strong>. Clear your cart to order
              from <strong>{pendingItem?.restaurantName}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 border border-line rounded-xl text-sm font-medium text-navy-soft hover:bg-cream cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark cursor-pointer"
              >
                Clear & add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
