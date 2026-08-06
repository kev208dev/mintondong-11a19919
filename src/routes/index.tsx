import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, HelpCircle, MapPin, Plus, UserPlus, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RoleBadges } from "@/components/app/RolesSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore, useTodayPlayers } from "@/lib/badminton/store";
import { ATTENDANCE_LABEL, LEVEL_LABEL, type AttendanceStatus, type Level } from "@/lib/badminton/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "민턴동 – 배드민턴 클럽 관리 앱" },
      {
        name: "description",
        content:
          "오늘 누가 오는지 한 번에 확인하고, 참석 체크·게스트·코트 배정까지 관리하는 배드민턴 동호회 앱.",
      },
      { property: "og:title", content: "민턴동 – 배드민턴 클럽 관리 앱" },
      {
        property: "og:description",
        content: "오늘 누가 오는지 한 번에 확인하고, 참석 체크·게스트·코트 배정까지 관리하는 배드민턴 동호회 앱.",
      },
    ],
  }),
  component: TodayPage,
});

const STATES: { key: AttendanceStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { key: "ATTEND", label: "참석", icon: CheckCircle2 },
  { key: "LATE", label: "늦게", icon: Clock },
  { key: "MAYBE", label: "미정", icon: HelpCircle },
  { key: "ABSENT", label: "불참", icon: XCircle },
];

function TodayPage() {
  const { club, setAttendance, toggleCheckIn, addGuest, removeGuest, can, meMemberId } = useStore();
  const { all, counts, coming } = useTodayPlayers();
  const [guestName, setGuestName] = useState("");
  const [guestLevel, setGuestLevel] = useState<Level>(3);
  const [open, setOpen] = useState(false);
  // 본인 출석/체크인은 항상 가능하고, 타인 대리 변경은 권한이 필요하다
  const canManageMembers = can("MANAGE_MEMBERS");
  const canManageAttendance = can("MANAGE_ATTENDANCE");
  const canCheckinOthers = can("CHECKIN_OTHERS");

  if (!can("VIEW_ATTENDANCE")) {
    return (
      <section className="rounded-3xl border border-border bg-card shadow-soft p-6 text-center">
        <p className="text-base font-bold text-foreground">출석 현황을 볼 권한이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">클럽 운영자에게 출석 보기 권한을 요청해 주세요.</p>
      </section>
    );
  }

  const guests = club.guests;
  const checkedInCount = club.checkedIn.length;

  return (
    <>
      <section className="brand-gradient card-soft rounded-3xl p-5 text-primary-foreground">
        <p className="text-xs font-semibold opacity-70">오늘 참석 예정</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">
          {coming.length}
          <span className="ml-1 text-lg font-bold opacity-70">명</span>
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-xs opacity-80">
          <MapPin className="size-3.5" />
          {club.club.location}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {STATES.map((s) => (
            <div key={s.key} className="rounded-2xl bg-primary-foreground/10 py-2">
              <p className="text-lg font-extrabold">{counts[s.key]}</p>
              <p className="text-[11px] opacity-75">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary-foreground/10 px-3 py-2.5 text-sm">
          <span className="font-semibold">현장 체크인</span>
          <span className="font-extrabold">
            {checkedInCount} / {coming.length}
          </span>
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">게스트 {guests.length}명</h2>
          {canManageMembers ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="h-9 rounded-full font-bold">
                <UserPlus className="mr-1 size-4" /> 게스트 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[340px] rounded-3xl">
              <DialogHeader>
                <DialogTitle>게스트 추가</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="이름"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="h-12 rounded-2xl"
              />
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as Level[]).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setGuestLevel(lv)}
                    className={`h-10 flex-1 rounded-xl text-xs font-bold ${
                      guestLevel === lv
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {LEVEL_LABEL[lv]}
                  </button>
                ))}
              </div>
              <Button
                className="h-12 rounded-2xl font-bold"
                disabled={!guestName.trim()}
                onClick={() => {
                  addGuest(guestName.trim(), guestLevel);
                  setGuestName("");
                  setOpen(false);
                }}
              >
                <Plus className="mr-1 size-4" /> 추가하고 바로 체크인
              </Button>
            </DialogContent>
          </Dialog>
          ) : null}
        </div>
        {guests.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {guests.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-2 rounded-full border border-border bg-card shadow-soft px-3 py-1.5 text-xs font-semibold"
              >
                {g.name} · {LEVEL_LABEL[g.level]}
                {canManageMembers ? (
                <button
                  onClick={() => removeGuest(g.id)}
                  className="text-muted-foreground"
                  aria-label={`${g.name} 삭제`}
                >
                  <XCircle className="size-4" />
                </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">아직 게스트가 없어요.</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold text-foreground">멤버 {all.length}명</h2>
        <ul className="mt-3 space-y-2">
          {all.map((m) => {
            const status = club.attendance[m.id] ?? "NONE";
            const isIn = club.checkedIn.includes(m.id);
            return (
              <li key={m.id} className="rounded-2xl border border-border bg-card shadow-soft p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                    {m.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {m.name}
                      {m.isGuest ? (
                        <span className="ml-1 text-[10px] font-bold text-muted-foreground">
                          게스트
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {LEVEL_LABEL[m.level]} · {ATTENDANCE_LABEL[status]}
                    </p>
                    {m.isGuest ? null : <RoleBadges memberId={m.id} />}
                  </div>
                  <button
                    onClick={() => toggleCheckIn(m.id)}
                    disabled={m.id !== meMemberId && !canCheckinOthers}
                    className={`h-9 rounded-full px-3 text-xs font-bold transition-colors disabled:opacity-40 ${
                      isIn
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {isIn ? "체크인 완료" : "체크인"}
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                  {STATES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setAttendance(m.id, s.key)}
                      disabled={m.id !== meMemberId && !canManageAttendance}
                      className={`h-10 rounded-xl text-xs font-bold transition-colors duration-75 disabled:opacity-40 ${
                        status !== s.key
                          ? "bg-muted text-muted-foreground active:bg-accent"
                          : s.key === "ABSENT"
                            ? "bg-secondary text-secondary-foreground ring-1 ring-border"
                            : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
