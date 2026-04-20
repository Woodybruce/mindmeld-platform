/**
 * Push Notifications hook — registers for push on both native (Capacitor/FCM)
 * and web (Web Push API with VAPID).
 *
 * Call once near the app root (e.g. in Index.tsx).
 */

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Prevent duplicate registration for the same user across remounts/StrictMode.
    if (registeredRef.current === user.id) return;
    registeredRef.current = user.id;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let fcmHandler: ((e: Event) => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      setupNativePush();
    } else {
      setupWebPush();
    }

    async function setupWebPush() {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          console.log("[WebPush] Not supported in this browser");
          return;
        }

        const reg = await navigator.serviceWorker.register("/push-sw.js");
        if (cancelled) return;
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        const permission = await Notification.requestPermission();
        if (cancelled || permission !== "granted") return;

        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn("[WebPush] VITE_VAPID_PUBLIC_KEY not set");
          return;
        }

        let subscription = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }
        if (cancelled) return;

        await fetch("/api/web-push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user!.id,
            subscription: subscription.toJSON(),
          }),
        });
      } catch (e) {
        console.warn("[WebPush] Setup failed:", e);
      }
    }

    async function setupNativePush() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        if (cancelled) return;

        const permResult = await PushNotifications.requestPermissions();
        if (cancelled || permResult.receive !== "granted") return;

        fcmHandler = async (e: Event) => {
          if (cancelled) return;
          const token = (e as CustomEvent).detail as string;
          if (!token) return;
          const platform = Capacitor.getPlatform();
          const { error } = await supabase.from("device_tokens").upsert(
            {
              user_id: user!.id,
              token,
              platform,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" }
          );
          if (error) console.error("[Push] token upsert failed", error);
        };
        window.addEventListener("fcmToken", fcmHandler);

        await PushNotifications.register();
        if (cancelled) return;

        const foregroundListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[Push] Foreground notification:", notification);
          }
        );

        const actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const route = action.notification?.data?.route as string | undefined;
            if (route) window.location.href = route;
          }
        );

        cleanup = () => {
          foregroundListener.remove();
          actionListener.remove();
        };
      } catch (e) {
        console.warn("[Push] Native setup failed:", e);
      }
    }

    return () => {
      cancelled = true;
      if (fcmHandler) window.removeEventListener("fcmToken", fcmHandler);
      cleanup?.();
      // Allow re-registration when the user changes (login/logout cycle).
      if (registeredRef.current === user.id) registeredRef.current = null;
    };
  }, [user]);
}
