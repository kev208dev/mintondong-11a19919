export type RefundPolicyConfig = {
  /** 결제 화면에 표시하는 공통 취소 가능 기준 */
  cancellationDeadline: string | null;
  /** 결제 화면에 표시하는 예상 환불 처리 기간 */
  expectedRefundPeriod: string | null;
};

function publicEnv(name: string): string | null {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function publicEnvOr(name: string, fallback: string): string {
  return publicEnv(name) ?? fallback;
}

/**
 * 현재 운영 확정 정책을 기본값으로 사용하고, 배포 환경에서 더 구체적인 정책을 설정하면 그 값을
 * 우선합니다. 상품별로 별도 조건이 있는 경우 결제 전에 해당 상품 화면에서 추가 고지합니다.
 */
export const refundPolicyConfig: RefundPolicyConfig = {
  cancellationDeadline: publicEnvOr(
    "VITE_REFUND_CANCELLATION_DEADLINE",
    "결제 후 7일 이내이면서 해당 레슨 제공이 시작되기 전까지 전액 환불",
  ),
  expectedRefundPeriod: publicEnvOr(
    "VITE_REFUND_EXPECTED_PROCESSING_PERIOD",
    "취소·환불 승인 후 3영업일 이내 결제 취소 또는 환불 요청 (실제 반영 시점은 카드사·은행에 따라 추가 소요될 수 있음)",
  ),
};

export const isRefundPolicyReady = Boolean(
  refundPolicyConfig.cancellationDeadline && refundPolicyConfig.expectedRefundPeriod,
);
