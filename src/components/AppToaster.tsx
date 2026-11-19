"use client";

import { Toaster } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      containerStyle={{ zIndex: 60 }}
      toastOptions={{
        duration: 5000,
        style: {
          background: "#ffffff",
          color: "#18181b",
          border: "1px solid #e4e4e7",
          borderRadius: "0.75rem",
          boxShadow: "0 10px 30px rgba(24, 24, 27, 0.12)",
          fontSize: "0.875rem",
          lineHeight: "1.5",
          maxWidth: "min(32rem, calc(100vw - 2rem))",
        },
        success: {
          iconTheme: {
            primary: "#15803d",
            secondary: "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#b91c1c",
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
}
