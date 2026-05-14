// components/CartSidebar.tsx
"use client";

import Link from "next/link";
import { ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import GroupOrderBanner from "@/components/GroupOrderBanner";

export default function CartSidebar() {
  const { cart, subtotal, itemCount, removeItem, updateQty, shareGroupOrderLink } = useCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-2xl shadow-sm p-6">
        <ShoppingBag className="w-8 h-8 mb-2" />
        <p className="text-sm font-medium">Your cart is empty</p>
        <p className="text-xs mt-1">Add items from the menu</p>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden max-h-[80vh]">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Your order</h3>
        <p className="text-xs text-gray-400 mt-0.5">{cart.restaurantName}</p>
      </div>

      <GroupOrderBanner
        shareLink={shareGroupOrderLink()}
        participants={cart.participantNames}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.items.map((item, idx) => (
          <div key={`${item.itemId}-${item.addedBy}-${idx}`} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-400">{item.price} MAD</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQty(item.itemId, item.quantity - 1)}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <Minus className="w-3 h-3 text-gray-600" />
              </button>
              <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.itemId, item.quantity + 1)}
                className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center hover:bg-orange-100 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#E05A23]" />
              </button>
              <button
                onClick={() => removeItem(item.itemId)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 cursor-pointer ml-0.5"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-500">Subtotal ({itemCount} items)</span>
          <span className="font-semibold text-gray-900">{subtotal} MAD</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full bg-[#E05A23] text-white text-center py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
