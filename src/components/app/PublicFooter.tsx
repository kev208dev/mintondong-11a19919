import { Link } from "@tanstack/react-router";
import { businessConfig, businessValue } from "@/config/business";

const LEGAL_LINKS = [
  { to: "/terms", label: "이용약관" },
  { to: "/privacy", label: "개인정보처리방침" },
  { to: "/refund-policy", label: "취소 및 환불 정책" },
  { to: "/business-info", label: "사업자 정보" },
] as const;

const BUSINESS_ROWS = [
  ["상호명", businessConfig.businessName],
  ["대표자", businessConfig.representativeName],
  ["사업자등록번호", businessConfig.businessRegistrationNumber],
  ["사업장 주소", businessConfig.businessAddress],
  ["고객센터 전화", businessConfig.customerServicePhone],
  ["고객센터 이메일", businessConfig.customerServiceEmail],
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5">
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-foreground">{businessConfig.serviceName}</p>
        <dl className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {BUSINESS_ROWS.map(([label, value]) => (
            <div key={label} className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-foreground/70">{label}</dt>
              <dd className="min-w-0 break-words">{businessValue(value)}</dd>
            </div>
          ))}
        </dl>
        <nav aria-label="법적 정보" className="mt-4 border-t border-border pt-3">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
            {LEGAL_LINKS.map((item) => (
              <li key={item.to} className="min-w-0">
                <Link
                  to={item.to}
                  className="block break-keep text-[11px] font-bold text-muted-foreground hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
