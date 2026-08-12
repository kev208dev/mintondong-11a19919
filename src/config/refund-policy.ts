export type RefundPolicyConfig = {
  /** 운영 확정 후 실제 공통 취소 신청 기준 */
  cancellationDeadline: string | null;
  /** 운영 확정 후 실제 예상 환불 처리 기간 */
  expectedRefundPeriod: string | null;
};

/** 확정되지 않은 시한·환불률·처리기간은 null로 두며 페이지에서 임의 숫자를 만들지 않습니다. */
export const refundPolicyConfig: RefundPolicyConfig = {
  cancellationDeadline: null,
  expectedRefundPeriod: null,
};
