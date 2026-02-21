/**
 * Push Notifications hook — registers device token with FCM via Capacitor
 * and stores it in the device_tokens table.
 *
 * Call once near the app root (e.g. in Index.tsx or App.tsx).
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
        // Dynamic import so web builds don't fail
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          console.log("[Push] Permission not granted");
          return;
        }

        // Register with APNs / FCM
        await PushNotifications.register();

        // Listen for the token
        const tokenListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            console.log("[Push] Token:", token.value);
            registeredRef.current = true;

            const platform = Capacitor.getPlatform(); // 'ios' | 'android'

            // Upsert token
            await supabase.from("device_tokens").upsert(
              {
                user_id: user.id,
                token: token.value,
                platform,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,token" }
            );
          }
        );

        // Handle registration errors
        const errorListener = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.error("[Push] Registration error:", err);
          }
        );

        // Handle incoming notifications while app is in foreground
        const foregroundListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[Push] Foreground notification:", notification);
            // Could show an in-app toast here
          }
        );

        // Handle notification tap (app opened from notification)
        const actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            console.log("[Push] Action performed:", action);
            // Could navigate to chat, etc. based on action.notification.data
          }
        );

        cleanup = () => {
          tokenListener.remove();
          errorListener.remove();
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
