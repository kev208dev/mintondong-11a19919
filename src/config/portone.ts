const CONFIRMED_PORTONE_STORE_ID = "store-81345dbd-4a7e-49ce-b68f-f1c9465294c2";
const CONFIRMED_PORTONE_CHANNEL_KEY = "channel-key-f8da7be3-4a42-4e83-a7a9-f5926b6fec7d";

function publicEnv(name: string): string | null {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Store ID와 Channel Key는 PortOne 결제창에 전달되는 공개 식별값이다. Cloudflare Git Build
 * 변수 주입이 누락돼도 확정된 테스트 채널을 사용한다. KG이니시스 V2 테스트 기간에는 stale
 * build 변수가 checkout을 다시 끄지 못하도록 공개 활성화 상태를 고정한다. 서버 API Secret에는
 * 어떤 fallback도 두지 않으며, 누락 시 결제 준비 단계에서 fail-closed한다.
 */
export const portOnePublicConfig = {
  storeId: publicEnv("VITE_PORTONE_STORE_ID") ?? CONFIRMED_PORTONE_STORE_ID,
  channelKey: publicEnv("VITE_PORTONE_CHANNEL_KEY") ?? CONFIRMED_PORTONE_CHANNEL_KEY,
  enabled: true,
} as const;
