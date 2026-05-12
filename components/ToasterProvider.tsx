"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "12px",
          fontWeight: 500,
          fontSize: "14px",
          padding: "12px 16px",
        },
        success: {
          iconTheme: { primary: "#006747", secondary: "#fff" },
          style: { background: "#f0faf5", color: "#003d2a", border: "1px solid #006747/20" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#fff" },
        },
      }}
    />
  );
}
