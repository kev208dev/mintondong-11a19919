import type { CapacitorConfig } from "@capacitor/cli";

/** Apple/Google 등록 전 변경해야 할 경우 이 값을 먼저 변경한 뒤 native project를 다시 sync한다. */
export const MINTONDONG_APP_ID = "com.mintondong.app";
export const MINTONDONG_PRODUCTION_HOST = "mintondong-11a19919.kev208dev.workers.dev";

const config: CapacitorConfig = {
  appId: MINTONDONG_APP_ID,
  appName: "민턴동",
  webDir: "mobile-web",
  server: {
    allowNavigation: [MINTONDONG_PRODUCTION_HOST],
    cleartext: false,
    errorPath: "index.html",
  },
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#FFFFFFFF",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FFFFFFFF",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
