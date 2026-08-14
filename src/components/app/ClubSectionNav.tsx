import { Link } from "@tanstack/react-router";
import { isClubSection } from "./app-shell-state";

/** 동호회 섹션 내부 가로 스크롤 서브 내비게이션 */
const SECTIONS = [
  { to: "/club", label: "동호회 홈", exact: true },
  { to: "/games", label: "경기" },
  { to: "/lessons", label: "레슨" },
  { to: "/club/schedule", label: "일정" },
  { to: "/club/ranking", label: "랭킹" },
  { to: "/club/more", label: "더보기" },
] as const;

export function ClubSectionNav({ pathname }: { pathname: string }) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max items-center gap-1.5 pb-1">
        {SECTIONS.map((s) => {
          const active =
            "exact" in s && s.exact
              ? pathname === s.to
              : pathname === s.to || pathname.startsWith(`${s.to}/`);
          return (
            <li key={s.to}>
              <Link
                to={s.to}
                preload="intent"
                className={`flex h-8 items-center rounded-full px-3 text-xs font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground active:bg-accent"
                }`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
