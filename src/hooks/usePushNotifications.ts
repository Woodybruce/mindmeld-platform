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
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || registeredRef.current) return;

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
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("[WebPush] Permission denied");
          return;
        }

        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn("[WebPush] VITE_VAPID_PUBLIC_KEY not set");
          return;
        }

        let subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        registeredRef.current = true;
        console.log("[WebPush] Subscription active");

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

    let cleanup: (() => void) | undefined;

    async function setupNativePush() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          console.log("[Push] Permission not granted");
          return;
        }

        await PushNotifications.register();

        const handleFcmToken = async (e: Event) => {
          const token = (e as CustomEvent).detail as string;
          if (!token || registeredRef.current) return;
          console.log("[Push] FCM token:", token);
          registeredRef.current = true;

          const platform = Capacitor.getPlatform();

          await supabase.from("device_tokens").upsert(
            {
              user_id: user!.id,
              token,
              platform,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" }
          );
        };

        window.addEventListener("fcmToken", handleFcmToken);

        const foregroundListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[Push] Foreground notification:", notification);
          }
        );

        const actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            console.log("[Push] Action performed:", action);
            const route = action.notification?.data?.route as string | undefined;
            if (route) {
              window.location.href = route;
            }
          }
        );

        cleanup = () => {
          window.removeEventListener("fcmToken", handleFcmToken);
          foregroundListener.remove();
          actionListener.remove();
        };
      } catch (e) {
        console.warn("[Push] Native setup failed:", e);
      }
    }

    return () => cleanup?.();
  }, [user]);
}
