/**
 * Widget Bridge — pushes key app data to the native iOS Widget Extension
 * via Capacitor. On non-native platforms this is a no-op.
 *
 * The native plugin writes to a shared App Group (UserDefaults) so the
 * SwiftUI WidgetExtension can read the same data.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";

interface WidgetBridgePlugin {
  updateWidgetData(options: { json: string }): Promise<void>;
}

const NativeWidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

const isNative = Capacitor.isNativePlatform();

export interface WidgetData {
  /** User's display name */
  username: string;
  /** Partner's display name */
  partnerName: string;
  /** Today's tasks: { text, done }[] */
  tasks: { text: string; done: boolean }[];
  /** Next upcoming event subject + ISO date */
  nextEvent: { subject: string; date: string } | null;
  /** Current streak count */
  streakDays: number;
  /** ISO timestamp of last update */
  updatedAt: string;
}

/**
 * Call this whenever key data changes (tasks toggled, events fetched, etc.)
 * On web it's a silent no-op.
 */
export async function pushWidgetData(data: WidgetData): Promise<void> {
  if (!isNative) return;
  try {
    await NativeWidgetBridge.updateWidgetData({ json: JSON.stringify(data) });
  } catch (e) {
    console.warn("[WidgetBridge] failed to push data", e);
  }
}
