import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { businessConfig, businessValue, isGeneralCustomerServicePhone } from "@/config/business";

export const Route = createFileRoute("/business-info")({
  head: () => ({
    meta: [
      { title: "사업자 정보 – 민턴동" },
      {
        name: "description",
        content: "민턴동 운영 사업자와 고객센터 정보를 확인할 수 있습니다.",
      },
      { property: "og:title", content: "사업자 정보 – 민턴동" },
      { property: "og:description", content: "민턴동 사업자 및 고객센터 안내" },
    ],
  }),
  component: BusinessInfoPage,
});

function BusinessInfoPage() {
  const rows = [
    ["서비스명", businessConfig.serviceName],
    ["상호", businessConfig.businessName],
    ["대표자", businessConfig.representativeName],
    ["사업자등록번호", businessConfig.businessRegistrationNumber],
    ["사업장 주소", businessConfig.businessAddress],
    ["전화번호", businessConfig.customerServicePhone],
    ["이메일", businessConfig.customerServiceEmail],
    ...(businessConfig.ecommerceRegistrationNumber
      ? [["통신판매업 신고번호", businessConfig.ecommerceRegistrationNumber] as const]
      : []),
  ] as const;

  return (
    <article className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
      <header className="brand-header px-5 py-6">
        <Building2 className="size-5 text-primary" />
        <h2 className="mt-2 text-xl font-extrabold tracking-tight text-foreground">사업자 정보</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          민턴동 서비스 운영자와 고객 문의 정보를 안내합니다.
        </p>
      </header>
      <dl className="divide-y divide-border px-5">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid min-w-0 grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-4 text-xs"
          >
            <dt className="font-bold text-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-muted-foreground">{businessValue(value)}</dd>
          </div>
        ))}
      </dl>
      {!businessConfig.ecommerceRegistrationNumber ? (
        <p className="border-t border-border px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
          통신판매업 신고번호는 신고 완료 후 표시됩니다.
        </p>
      ) : null}
      {!isGeneralCustomerServicePhone(businessConfig.customerServicePhone) ? (
        <p className="border-t border-amber-300 bg-amber-50 px-5 py-4 text-[11px] leading-relaxed text-amber-900">
          PG 심사 제출 전 사업자 명의의 일반전화 또는 전국대표번호를 고객센터 번호로 등록해야
          합니다. 휴대전화 번호만으로는 심사 준비 완료로 보지 않습니다.
        </p>
      ) : null}
    </article>
  );
}
