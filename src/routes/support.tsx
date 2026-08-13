import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleHelp, Mail, Phone } from "lucide-react";
import { businessConfig, businessValue } from "@/config/business";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "고객지원 – 민턴동" },
      {
        name: "description",
        content: "민턴동 이용, 계정, 클럽, 레슨 및 결제 관련 문의 방법을 안내합니다.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const email = businessConfig.customerServiceEmail;
  const phone = businessConfig.customerServicePhone;

  return (
    <div className="space-y-4">
      <section className="brand-header rounded-3xl border border-border bg-card p-5">
        <CircleHelp className="size-6 text-primary" />
        <h2 className="mt-2 text-xl font-extrabold text-foreground">민턴동 고객지원</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          계정, 클럽, 레슨 또는 결제 이용 중 도움이 필요하면 아래 연락처로 문의해 주세요.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-extrabold text-foreground">문의하기</h2>
        <dl className="mt-3 space-y-3 text-xs">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-secondary p-3">
            <Mail className="size-4 shrink-0 text-primary" />
            <dt className="sr-only">이메일</dt>
            <dd className="min-w-0 break-all font-bold text-foreground">
              {email ? <a href={`mailto:${email}`}>{email}</a> : businessValue(email)}
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-secondary p-3">
            <Phone className="size-4 shrink-0 text-primary" />
            <dt className="sr-only">전화</dt>
            <dd className="min-w-0 break-all font-bold text-foreground">
              {phone ? (
                <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a>
              ) : (
                businessValue(phone)
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          결제 문의 시 계정 이메일, 레슨명, 결제 시각을 함께 알려주시면 확인에 도움이 됩니다. 카드
          번호나 비밀번호 등 결제수단의 민감정보는 보내지 마세요.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-extrabold text-foreground">정책 및 계정</h2>
        <nav className="mt-3 grid gap-2 text-xs font-bold text-primary">
          <Link to="/terms">이용약관</Link>
          <Link to="/privacy">개인정보처리방침</Link>
          <Link to="/refund-policy">취소 및 환불 정책</Link>
          <Link to="/business-info">사업자 정보</Link>
          <Link to="/account-deletion">계정 삭제</Link>
        </nav>
      </section>
    </div>
  );
}
