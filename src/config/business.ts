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

/**
 * 공개 페이지에 표시되는 사업자 정보입니다.
 * 실사업자 정보는 .env 의 VITE_BUSINESS_* 값으로만 주입하며,
 * 저장소에는 확인되지 않은 값을 기본값으로 넣지 않습니다.
 */
export const businessConfig: BusinessConfig = {
  serviceName: "민턴동",
  businessName: publicEnv("VITE_BUSINESS_NAME"),
  representativeName: publicEnv("VITE_BUSINESS_REPRESENTATIVE_NAME"),
  businessRegistrationNumber: publicEnv("VITE_BUSINESS_REGISTRATION_NUMBER"),
  businessAddress: publicEnv("VITE_BUSINESS_ADDRESS"),
  customerServicePhone: publicEnv("VITE_CUSTOMER_SERVICE_PHONE"),
  customerServiceEmail: publicEnv("VITE_CUSTOMER_SERVICE_EMAIL"),
  ecommerceRegistrationNumber: publicEnv("VITE_ECOMMERCE_REGISTRATION_NUMBER"),
  policyEffectiveDate: publicEnv("VITE_POLICY_EFFECTIVE_DATE"),
};

export const UNSET_BUSINESS_VALUE = "운영자 입력 필요";

export function businessValue(value: string | null | undefined): string {
  return value ?? UNSET_BUSINESS_VALUE;
}
