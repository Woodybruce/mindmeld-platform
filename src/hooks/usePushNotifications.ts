/**
 * Push Notifications hook — registers for push permissions via Capacitor,
 * then receives the real FCM token from the native layer (injected via
 * a custom DOM event from AppDelegate's MessagingDelegate).
 *
 * Call once near the app root (e.g. in Index.tsx).
 * On web this is a silent no-op.
 */

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function usePushNotifications() {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || registeredRef.current) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          console.log("[Push] Permission not granted");
          return;
        }

        // Register with APNs / FCM — triggers native token flow
        await PushNotifications.register();

        // Listen for the REAL FCM token injected by AppDelegate via MessagingDelegate
        const handleFcmToken = async (e: Event) => {
          const token = (e as CustomEvent).detail as string;
          if (!token || registeredRef.current) return;
          console.log("[Push] FCM token:", token);
          registeredRef.current = true;

          const platform = Capacitor.getPlatform(); // 'ios' | 'android'

          await supabase.from("device_tokens").upsert(
            {
              user_id: user.id,
              token,
              platform,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" }
          );
        };

        window.addEventListener("fcmToken", handleFcmToken);

        // Handle incoming notifications while app is in foreground
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
        console.warn("[Push] Setup failed:", e);
      }
    };

    setup();

    return () => cleanup?.();
  }, [user]);
}
