import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { businessConfig, businessValue } from "@/config/business";

const LEGAL_LINKS = [
  { to: "/terms", label: "이용약관" },
  { to: "/privacy", label: "개인정보처리방침" },
  { to: "/refund-policy", label: "취소·환불" },
  { to: "/business-info", label: "사업자 정보" },
  { to: "/support", label: "고객지원" },
  { to: "/account-deletion", label: "계정 삭제" },
] as const;

const BUSINESS_ROWS = [
  ["상호", businessConfig.businessName],
  ["대표", businessConfig.representativeName],
  ["사업자등록번호", businessConfig.businessRegistrationNumber],
  ["주소", businessConfig.businessAddress],
  ["고객센터", businessConfig.customerServicePhone],
  ["이메일", businessConfig.customerServiceEmail],
] as const;

export function PublicFooter({ floatingNav = false }: { floatingNav?: boolean }) {
  return (
    <footer
      className={`border-t border-border/70 bg-card/60 px-4 pt-3 ${
        floatingNav ? "pb-20" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <nav aria-label="법적 정보">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {LEGAL_LINKS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <details className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-semibold text-muted-foreground marker:hidden">
          {businessConfig.serviceName} 사업자 정보
          <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-2 grid gap-1 rounded-xl bg-secondary/45 px-3 py-2.5 text-[9.5px] leading-4 text-muted-foreground">
          {BUSINESS_ROWS.map(([label, value]) => (
            <div key={label} className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-foreground/55">{label}</dt>
              <dd className="min-w-0 break-words">{businessValue(value)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </footer>
  );
}
