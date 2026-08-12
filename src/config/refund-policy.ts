export type RefundPolicyConfig = {
  /** 운영 확정 후 실제 공통 취소 신청 기준 */
  cancellationDeadline: string | null;
  /** 운영 확정 후 실제 예상 환불 처리 기간 */
  expectedRefundPeriod: string | null;
};

function publicEnv(name: string): string | null {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** 확정되지 않은 시한·환불률·처리기간은 비워 두며 페이지에서 임의 숫자를 만들지 않습니다. */
export const refundPolicyConfig: RefundPolicyConfig = {
  cancellationDeadline: publicEnv("VITE_REFUND_CANCELLATION_DEADLINE"),
  expectedRefundPeriod: publicEnv("VITE_REFUND_EXPECTED_PROCESSING_PERIOD"),
};

export const isRefundPolicyReady = Boolean(
  refundPolicyConfig.cancellationDeadline && refundPolicyConfig.expectedRefundPeriod,
);
