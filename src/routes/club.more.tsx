import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Megaphone,
  Settings2,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/club/more")({
  head: () => ({
    meta: [
      { title: "동호회 더보기 – 민턴동" },
      { name: "description", content: "회원, 공지, 회비/재정, 동호회 관리로 이동해요." },
      { property: "og:title", content: "동호회 더보기 – 민턴동" },
      { property: "og:description", content: "회원·공지·회비·관리 메뉴." },
    ],
  }),
  component: ClubMorePage,
});

const ITEMS = [
  { to: "/club/members", label: "회원", desc: "회원·게스트·역할 확인", icon: Users },
  { to: "/club/notices", label: "공지", desc: "동호회 공지사항", icon: Megaphone },
  { to: "/club/finance", label: "회비/재정", desc: "월 회비와 수입·지출", icon: Wallet },
  { to: "/club/manage", label: "동호회 관리", desc: "운영진 전용 설정", icon: Settings2 },
  { to: "/club/attendance", label: "출석 체크", desc: "오늘 참석·현장 체크인", icon: UserCheck },
  { to: "/records", label: "활동 기록", desc: "경기 결과와 멤버 활동", icon: ClipboardList },
] as const;

function ClubMorePage() {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {ITEMS.map(({ to, label, desc, icon: Icon }) => (
        <li key={to}>
          <Link to={to} className="flex items-center gap-3 px-3.5 py-3 active:bg-accent">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">{label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
