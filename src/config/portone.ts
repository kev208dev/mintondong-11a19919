const CONFIRMED_PORTONE_STORE_ID = "store-81345dbd-4a7e-49ce-b68f-f1c9465294c2";
const CONFIRMED_PORTONE_CHANNEL_KEY = "channel-key-f8da7be3-4a42-4e83-a7a9-f5926b6fec7d";

function publicEnv(name: string): string | null {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Store ID와 Channel Key는 PortOne 결제창에 전달되는 공개 식별값이다. Cloudflare Git Build
 * 변수 주입이 누락돼도 확정된 테스트 채널을 사용한다. 테스트 연동은 기본 활성화하되 배포
 * 환경에서 명시적으로 false를 지정하면 비활성화한다. 서버 API Secret에는 어떤 fallback도
 * 두지 않으며, 누락 시 결제 준비 단계에서 fail-closed한다.
 */
export const portOnePublicConfig = {
  storeId: publicEnv("VITE_PORTONE_STORE_ID") ?? CONFIRMED_PORTONE_STORE_ID,
  channelKey: publicEnv("VITE_PORTONE_CHANNEL_KEY") ?? CONFIRMED_PORTONE_CHANNEL_KEY,
  enabled: publicEnv("VITE_PORTONE_ENABLED") !== "false",
} as const;
