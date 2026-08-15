import { createFileRoute } from "@tanstack/react-router";
import { RoleBadges, RolesSection } from "@/components/app/RolesSection";
import { useStore } from "@/lib/badminton/store";
import { ATTENDANCE_LABEL, LEVEL_LABEL } from "@/lib/badminton/types";

export const Route = createFileRoute("/club/members")({
  head: () => ({
    meta: [
      { title: "동호회 회원 – 민턴동" },
      { name: "description", content: "동호회 회원과 게스트, 역할·권한을 확인해요." },
      { property: "og:title", content: "동호회 회원 – 민턴동" },
      { property: "og:description", content: "회원·게스트 목록과 역할 관리." },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const { club, can } = useStore();

  if (!can("VIEW_MEMBERS")) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm font-bold text-foreground">회원 목록을 볼 권한이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">운영자에게 권한을 요청해 주세요.</p>
      </section>
    );
  }

  const people = [...club.members, ...club.guests];

  return (
    <div className="space-y-4">
      <section>
        <p className="px-1 text-[11px] font-bold text-muted-foreground">
          회원 {club.members.length}명 · 게스트 {club.guests.length}명
        </p>
        <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-soft">
          {people.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                {m.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {m.name}
                  {m.isGuest ? (
                    <span className="ml-1 text-xs text-muted-foreground">게스트</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {LEVEL_LABEL[m.level]} · {ATTENDANCE_LABEL[club.attendance[m.id] ?? "NONE"]}
                </p>
                {m.isGuest ? null : <RoleBadges memberId={m.id} />}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          역할 및 권한
        </h2>
        <div className="mt-1.5">
          <RolesSection embedded />
        </div>
      </section>
    </div>
  );
}
