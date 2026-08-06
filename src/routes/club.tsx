import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  GraduationCap,
  LogOut,
  MapPin,
  Plus,
  Settings2,
  Shield,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FinanceSection } from "@/components/app/FinanceSection";
import { RoleBadges, RolesSection } from "@/components/app/RolesSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/badminton/store";
import { ATTENDANCE_LABEL, LEVEL_LABEL, WEEKDAY_LABEL } from "@/lib/badminton/types";

export const Route = createFileRoute("/club")({
  head: () => ({
    meta: [
      { title: "모임 관리 – 클럽 개설·초대코드·멤버" },
      {
        name: "description",
        content:
          "여러 클럽에 동시 소속하고, 클럽 개설·초대코드 가입·전환·탈퇴와 멤버·코트 설정을 관리해요.",
      },
      { property: "og:title", content: "모임 관리 – 민턴동" },
      { property: "og:description", content: "멀티 클럽 소속과 초대코드 가입을 지원해요." },
    ],
  }),
  component: ClubPage,
});

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 접이식 항목 헤더 (아이콘 + 제목 + 상태 요약 + chevron) */
function ItemHeader({
  icon,
  title,
  summary,
}: {
  icon: React.ReactNode;
  title: string;
  summary?: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{title}</span>
        {summary ? (
          <span className="block truncate text-[11px] font-medium text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </span>
    </span>
  );
}

const triggerClass =
  "min-h-[56px] gap-2 px-3 py-2 no-underline hover:no-underline active:bg-accent/60";

function ClubPage() {
  const {
    club,
    clubs,
    switchClub,
    createClub,
    joinClub,
    leaveClub,
    renameClub,
    setCourtCount,
    setLessonsEnabled,
    updateCoach,
    can,
  } = useStore();
  const canSettings = can("MANAGE_CLUB_SETTINGS");
  const canCourts = can("MANAGE_COURTS");
  const canInvite = can("INVITE_MEMBERS");
  const canLessons = can("MANAGE_LESSONS");
  const canCoaches = can("MANAGE_COACHES");
  const canViewMembers = can("VIEW_MEMBERS");
  const canViewFinance = can("VIEW_FINANCE");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [code, setCode] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [editName, setEditName] = useState(club.club.name);
  const [editLoc, setEditLoc] = useState(club.club.location);
  const [syncedId, setSyncedId] = useState(club.club.id);
  if (syncedId !== club.club.id) {
    setSyncedId(club.club.id);
    setEditName(club.club.name);
    setEditLoc(club.club.location);
  }

  return (
    <>
      {/* 상단 요약 카드 */}
      <section className="rounded-3xl border border-border bg-card shadow-soft p-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-base font-extrabold text-accent-foreground">
            {club.club.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-foreground">{club.club.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{club.club.location}</span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
            {club.club.ownedByMe ? "내가 개설" : "참여 중"}
          </span>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-primary">
          멤버 {club.members.length}명
          {club.guests.length ? ` · 게스트 ${club.guests.length}명` : ""} · 코트{" "}
          {club.courtCount}면
        </p>
        {canInvite ? (
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2">
            <Ticket className="size-3.5 shrink-0 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground">초대 코드</span>
            <span className="ml-auto truncate text-sm font-extrabold tracking-[0.15em] text-secondary-foreground">
              {club.club.inviteCode}
            </span>
            <button
              className="shrink-0 text-muted-foreground"
              aria-label="초대 코드 복사"
              onClick={() => {
                navigator.clipboard?.writeText(club.club.inviteCode);
                toast.success("초대 코드를 복사했어요.");
              }}
            >
              <Copy className="size-4" />
            </button>
          </div>
        ) : null}
      </section>

      {/* Quick actions */}
      <section className="mt-2 grid grid-cols-2 gap-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-2xl text-xs font-bold">
              <Plus className="mr-1 size-4" /> 클럽 만들기
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[340px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>새 클럽 만들기</DialogTitle>
            </DialogHeader>
            <Input
              className="h-12 rounded-2xl"
              placeholder="클럽 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              className="h-12 rounded-2xl"
              placeholder="활동 장소 (예: 서울 송파구 올림픽체육관)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Button
              className="h-12 rounded-2xl font-bold"
              disabled={!name.trim() || !location.trim()}
              onClick={() => {
                const created = createClub(name.trim(), location.trim());
                setName("");
                setLocation("");
                setCreateOpen(false);
                toast.success(`클럽 생성 완료 · 초대 코드 ${created}`);
              }}
            >
              만들고 전환하기
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="h-11 rounded-2xl text-xs font-bold">
              <Ticket className="mr-1 size-4" /> 코드로 가입
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[340px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>초대 코드로 가입</DialogTitle>
            </DialogHeader>
            <Input
              className="h-12 rounded-2xl text-center text-lg font-bold tracking-widest"
              placeholder="RALLY26"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">테스트용 데모 코드: RALLY26</p>
            <Button
              className="h-12 rounded-2xl font-bold"
              disabled={!code.trim()}
              onClick={() => {
                const res = joinClub(code);
                if (res.ok) {
                  toast.success(res.message);
                  setJoinOpen(false);
                  setCode("");
                } else toast.error(res.message);
              }}
            >
              가입하기
            </Button>
          </DialogContent>
        </Dialog>
      </section>

      {/* 내 클럽 목록 (접이식) */}
      {canViewMembers ? (
        <Accordion
          type="single"
          collapsible
          className="mt-2 overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
        >
          <AccordionItem value="clubs" className="border-b-0">
            <AccordionTrigger className={triggerClass}>
              <ItemHeader
                icon={<Users className="size-4" />}
                title={`내 클럽 ${clubs.length}개 · 전환`}
                summary="가입한 클럽을 전환하거나 탈퇴해요"
              />
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <ul className="space-y-2">
                {clubs.map((c) => {
                  const active = c.club.id === club.club.id;
                  return (
                    <li
                      key={c.club.id}
                      className={`rounded-2xl border p-3 ${
                        active ? "border-primary bg-accent" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-extrabold text-secondary-foreground">
                          {c.club.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">
                            {c.club.name}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{c.club.location}</span>
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-primary">
                            멤버 {c.members.length}명 · 코트 {c.courtCount}면 ·{" "}
                            {c.club.ownedByMe ? "내가 개설" : "참여 중"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant={active ? "secondary" : "default"}
                          className="h-10 flex-1 rounded-xl text-xs font-bold"
                          disabled={active}
                          onClick={() => switchClub(c.club.id)}
                        >
                          {active ? "현재 클럽" : "이 클럽으로 전환"}
                        </Button>
                        {!c.club.ownedByMe ? (
                          <Button
                            variant="ghost"
                            className="h-10 rounded-xl text-xs font-bold text-muted-foreground"
                            onClick={() => {
                              leaveClub(c.club.id);
                              toast.success(`${c.club.name}에서 나왔어요.`);
                            }}
                          >
                            <LogOut className="mr-1 size-4" /> 탈퇴
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      {/* 모임 관리 */}
      <h2 className="mt-5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        모임 관리
      </h2>
      <Accordion
        type="single"
        collapsible
        className="mt-2 overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
      >
        {canSettings || canCourts ? (
          <AccordionItem value="settings" className="border-border">
            <AccordionTrigger className={triggerClass}>
              <ItemHeader
                icon={<Settings2 className="size-4" />}
                title="클럽 설정"
                summary={`코트 ${club.courtCount}면 · 이름·장소 편집`}
              />
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {canSettings ? (
                  <>
                    <Input
                      className="h-12 rounded-2xl"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="클럽 이름"
                    />
                    <Input
                      className="h-12 rounded-2xl"
                      value={editLoc}
                      onChange={(e) => setEditLoc(e.target.value)}
                      placeholder="활동 장소"
                    />
                  </>
                ) : null}
                {canCourts ? (
                  <div className="flex items-center justify-between rounded-2xl bg-secondary px-3 py-2">
                    <span className="text-sm font-bold text-secondary-foreground">코트 수</span>
                    <div className="flex items-center gap-3">
                      <button
                        className="size-9 rounded-xl bg-background text-lg font-bold"
                        onClick={() => setCourtCount(club.courtCount - 1)}
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-extrabold tabular-nums">
                        {club.courtCount}
                      </span>
                      <button
                        className="size-9 rounded-xl bg-background text-lg font-bold"
                        onClick={() => setCourtCount(club.courtCount + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
                {canSettings ? (
                  <Button
                    className="h-12 w-full rounded-2xl font-bold"
                    onClick={() => {
                      renameClub(
                        editName.trim() || club.club.name,
                        editLoc.trim() || club.club.location,
                      );
                      toast.success("클럽 정보를 저장했어요.");
                    }}
                  >
                    저장
                  </Button>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="members" className="border-border">
          <AccordionTrigger className={triggerClass}>
            <ItemHeader
              icon={<Users className="size-4" />}
              title="멤버"
              summary={`멤버 ${club.members.length}명 · 게스트 ${club.guests.length}명`}
            />
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <ul className="space-y-2">
              {[...club.members, ...club.guests].map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl bg-secondary p-3"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-sm font-bold">
                    {m.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {m.name}
                      {m.isGuest ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">게스트</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {LEVEL_LABEL[m.level]} · {ATTENDANCE_LABEL[club.attendance[m.id] ?? "NONE"]}
                    </p>
                    {m.isGuest ? null : <RoleBadges memberId={m.id} />}
                  </div>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="roles" className="border-border">
          <AccordionTrigger className={triggerClass}>
            <ItemHeader
              icon={<Shield className="size-4" />}
              title="역할 및 권한"
              summary={`역할 ${club.roles.length}개`}
            />
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <RolesSection embedded />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="finance" className="border-border">
          <AccordionTrigger className={triggerClass}>
            <ItemHeader
              icon={<Wallet className="size-4" />}
              title="자금 · 회비"
              summary={
                canViewFinance ? `월 회비 ${won(club.finance.monthlyDues)}` : "권한 필요"
              }
            />
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <FinanceSection embedded />
          </AccordionContent>
        </AccordionItem>

        {canLessons || canCoaches ? (
          <AccordionItem value="lessons" className="border-b-0">
            <AccordionTrigger className={triggerClass}>
              <ItemHeader
                icon={<GraduationCap className="size-4" />}
                title="레슨 운영"
                summary={`${club.lessonsEnabled ? "켜짐" : "꺼짐"} · 코치 ${club.coaches.length}명`}
              />
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  코치·요금·가능 시간대를 관리해요.
                </p>
                {canLessons ? (
                  <button
                    onClick={() => setLessonsEnabled(!club.lessonsEnabled)}
                    className={`h-8 w-14 shrink-0 rounded-full transition-colors ${club.lessonsEnabled ? "bg-primary" : "bg-secondary"}`}
                    aria-label="레슨 운영 켜기/끄기"
                  >
                    <span
                      className={`block size-6 rounded-full bg-background transition-transform ${club.lessonsEnabled ? "translate-x-7" : "translate-x-1"}`}
                    />
                  </button>
                ) : null}
              </div>

              {club.lessonsEnabled && canCoaches ? (
                <ul className="mt-3 space-y-2">
                  {club.coaches.map((c) => (
                    <li key={c.id} className="rounded-2xl bg-secondary p-3">
                      <p className="text-sm font-extrabold text-secondary-foreground">
                        {c.name}
                        <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                          {c.specialties.join(" · ")}
                        </span>
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-muted-foreground">회당 요금</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step={5000}
                            className="h-10 w-28 rounded-xl bg-background text-right"
                            value={c.price}
                            onChange={(e) =>
                              updateCoach(c.id, {
                                price: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                          />
                          <span className="text-xs font-bold">원</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {WEEKDAY_LABEL.map((w, i) => {
                          const on = c.weekdays.includes(i);
                          return (
                            <button
                              key={w}
                              onClick={() =>
                                updateCoach(c.id, {
                                  weekdays: on
                                    ? c.weekdays.filter((d) => d !== i)
                                    : [...c.weekdays, i].sort((a, b) => a - b),
                                })
                              }
                              className={`size-9 rounded-xl text-xs font-bold ${on ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                            >
                              {w}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-muted-foreground">가능 시간</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-10 w-16 rounded-xl bg-background text-center"
                            value={c.startHour}
                            onChange={(e) =>
                              updateCoach(c.id, {
                                startHour: Math.min(23, Math.max(0, Number(e.target.value) || 0)),
                              })
                            }
                          />
                          <span className="text-xs font-bold">시 –</span>
                          <Input
                            type="number"
                            className="h-10 w-16 rounded-xl bg-background text-center"
                            value={c.endHour}
                            onChange={(e) =>
                              updateCoach(c.id, {
                                endHour: Math.min(24, Math.max(1, Number(e.target.value) || 1)),
                              })
                            }
                          />
                          <span className="text-xs font-bold">시</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
                  레슨을 끄면 레슨 탭에서 예약을 받을 수 없어요. 기존 예약 기록은 유지됩니다.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        ) : null}
      </Accordion>
    </>
  );
}
