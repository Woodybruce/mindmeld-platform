import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister service workers inside Capacitor native shell to prevent blank screens
const isCapacitorNative =
  typeof window !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

if (isCapacitorNative && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
