export type BusinessConfig = {
  serviceName: string;
  businessName: string | null;
  representativeName: string | null;
  businessRegistrationNumber: string | null;
  businessAddress: string | null;
  customerServicePhone: string | null;
  customerServiceEmail: string | null;
  ecommerceRegistrationNumber?: string | null;
  policyEffectiveDate?: string | null;
};

function publicEnv(name: string): string | null {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function publicEnvOr(name: string, fallback: string | null): string | null {
  return publicEnv(name) ?? fallback;
}

/**
 * 공개 페이지에 표시되는 사업자 정보입니다.
 * PG 심사에 필요한 확인된 공개 사업자 정보는 fallback 으로 제공하고,
 * 배포 환경의 VITE_BUSINESS_* 값이 있으면 그 값을 우선합니다.
 *
 * 휴대전화 번호는 PortOne의 PG/카드사 사이트 필수 노출 전화번호 요건을 충족하지 않으므로
 * customerServicePhone fallback 으로 사용하지 않습니다.
 */
export const businessConfig: BusinessConfig = {
  serviceName: "민턴동",
  businessName: publicEnvOr("VITE_BUSINESS_NAME", "다올"),
  representativeName: publicEnvOr("VITE_BUSINESS_REPRESENTATIVE_NAME", "이채호"),
  businessRegistrationNumber: publicEnvOr("VITE_BUSINESS_REGISTRATION_NUMBER", "751-19-02471"),
  businessAddress: publicEnvOr(
    "VITE_BUSINESS_ADDRESS",
    "서울 양천구 목동중앙서로6길 37 (402호)",
  ),
  customerServicePhone: publicEnv("VITE_CUSTOMER_SERVICE_PHONE"),
  customerServiceEmail: publicEnvOr("VITE_CUSTOMER_SERVICE_EMAIL", "kev208dev@gmail.com"),
  ecommerceRegistrationNumber: publicEnv("VITE_ECOMMERCE_REGISTRATION_NUMBER"),
  policyEffectiveDate: publicEnv("VITE_POLICY_EFFECTIVE_DATE"),
};

export const UNSET_BUSINESS_VALUE = "운영자 입력 필요";

export function businessValue(value: string | null | undefined): string {
  return value ?? UNSET_BUSINESS_VALUE;
}

/** PG/카드사 심사용 전화번호: PortOne 필수 구축요건상 휴대전화 번호는 사용할 수 없다. */
export function isGeneralCustomerServicePhone(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return /^(02\d{7,8}|0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}|1[568]\d{6})$/.test(digits);
}
