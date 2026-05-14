"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /admin/orders is an old route — redirect to the main admin dashboard.
 */
export default function AdminOrdersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/dashboard"); }, [router]);
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Redirecting to Admin Dashboard…</p>
    </main>
  );
}
