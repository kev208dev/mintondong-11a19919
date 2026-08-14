import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { NativeChromeState } from "@/components/app/app-shell-state";

type TabSelectedEvent = {
  route: string;
};

export interface NativeChromePlugin {
  setState(state: NativeChromeState): Promise<void>;
  addListener(
    eventName: "tabSelected",
    listener: (event: TabSelectedEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(eventName: "backRequested", listener: () => void): Promise<PluginListenerHandle>;
}

export const NativeChrome = registerPlugin<NativeChromePlugin>("NativeChrome");
