import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, GraduationCap, Loader2, Pencil, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listManageableLessonClubs,
  listManagedLessons,
  saveManagedLesson,
  setManagedLessonActive,
  type ManagedLesson,
} from "@/lib/clubs/lesson-management.api";
import {
  LESSON_WEEKDAYS,
  type LessonSaleInput,
  validateLessonSale,
} from "@/lib/clubs/lesson-management-core";

export const Route = createFileRoute("/club/manage_/lessons")({
  validateSearch: (search: Record<string, unknown>) => ({
    clubId: typeof search["clubId"] === "string" ? search["clubId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "레슨 관리 – 민턴동" },
      { name: "description", content: "클럽의 실제 코치·레슨 상품과 판매 상태를 관리합니다." },
    ],
  }),
  component: LessonManagementPage,
});

const emptyLesson = (): LessonSaleInput => ({
  name: "",
  intro: "",
  specialties: [],
  levelLabel: "",
  weekdays: [],
  startHour: 9,
  endHour: 18,
  durationMin: 50,
  priceWon: 0,
  isActive: false,
});

const won = (amount: number) => amount.toLocaleString("ko-KR") + "원";

function LessonManagementPage() {
  const { user, loading } = useAuth();
  const { clubId: requestedClubId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ManagedLesson | "new" | null>(null);
  const [savedLesson, setSavedLesson] = useState<ManagedLesson | null>(null);

  const clubs = useQuery({
    queryKey: ["lesson-management", "clubs", user?.id],
    queryFn: () => listManageableLessonClubs(user!.id),
    enabled: Boolean(user),
  });
  const selected =
    clubs.data?.find((club) => club.id === requestedClubId) ?? clubs.data?.[0] ?? null;
  const lessons = useQuery({
    queryKey: ["lesson-management", "lessons", selected?.id],
    queryFn: () => listManagedLessons(selected!.id),
    enabled: Boolean(selected),
  });

  useEffect(() => {
    if (!requestedClubId && selected) {
      void navigate({
        to: "/club/manage/lessons",
        search: { clubId: selected.id },
        replace: true,
      });
    }
  }, [navigate, requestedClubId, selected]);

  const refresh = async (clubId: string) => {
    await queryClient.invalidateQueries({
      queryKey: ["lesson-management", "lessons", clubId],
    });
    await queryClient.invalidateQueries({ queryKey: ["clubs", "public-lessons", clubId] });
  };
  const toggle = useMutation({
    mutationFn: setManagedLessonActive,
    onSuccess: async (lesson) => {
      await refresh(lesson.clubId);
      toast.success(lesson.isActive ? "판매를 시작했습니다." : "판매를 중지했습니다.");
    },
    onError: (error) => toast.error(safeLessonError(error)),
  });

  if (loading || clubs.isLoading) {
    return <Loader2 className="mx-auto mt-16 size-7 animate-spin text-primary" />;
  }
  if (!user) return null;
  if (clubs.error) return <MigrationNotice />;
  if (!selected) {
    return (
      <section className="rounded-3xl border border-border bg-card p-6 text-center">
        <GraduationCap className="mx-auto size-6 text-muted-foreground" />
        <h1 className="mt-3 text-base font-extrabold">관리할 수 있는 클럽이 없습니다</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          클럽을 만들거나 active 관리자 권한을 받은 뒤 실제 레슨 상품을 등록할 수 있어요.
        </p>
        <Button asChild className="mt-4 h-11 rounded-2xl">
          <Link to="/clubs/new">클럽 만들기</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <header className="rounded-3xl border border-border bg-card p-4 shadow-soft">
        <p className="text-[11px] font-bold text-primary">실제 Supabase 상품 관리</p>
        <h1 className="mt-1 text-lg font-extrabold">레슨 관리</h1>
        <select
          aria-label="관리할 클럽"
          className="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold"
          value={selected.id}
          onChange={(event) => {
            setEditing(null);
            setSavedLesson(null);
            void navigate({
              to: "/club/manage/lessons",
              search: { clubId: event.target.value },
              replace: true,
            });
          }}
        >
          {clubs.data?.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name} · {club.role === "owner" ? "소유자" : "관리자"}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[11px] text-muted-foreground">
          장소: {selected.location || "클럽 장소 미등록"} · 공개{" "}
          {selected.isPublic ? "켜짐" : "꺼짐"} · 레슨 운영{" "}
          {selected.lessonsEnabled ? "켜짐" : "꺼짐"}
        </p>
        {!selected.isPublic || !selected.lessonsEnabled ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
            클럽 공개와 레슨 운영이 모두 켜져야 판매중 상품이 공개 페이지와 checkout에 노출됩니다.
          </p>
        ) : null}
      </header>

      {savedLesson ? (
        <section className="rounded-3xl border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold">
            <CheckCircle2 className="size-4 text-primary" /> 레슨이 등록되었습니다.
          </p>
          <Button asChild variant="secondary" className="mt-3 h-10 w-full rounded-xl">
            <Link to="/clubs/$clubId/lessons" params={{ clubId: savedLesson.clubId }}>
              공개 페이지에서 보기 <ExternalLink className="ml-1 size-3.5" />
            </Link>
          </Button>
        </section>
      ) : null}

      {editing !== null ? (
        <LessonEditor
          key={editing === "new" ? "new" : editing.id}
          clubId={selected.id}
          lesson={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async (lesson) => {
            setEditing(null);
            setSavedLesson(lesson);
            await refresh(selected.id);
          }}
        />
      ) : lessons.isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-secondary" />
      ) : lessons.error ? (
        <MigrationNotice />
      ) : !lessons.data?.length ? (
        <section className="rounded-3xl border border-border bg-card p-7 text-center">
          <GraduationCap className="mx-auto size-7 text-muted-foreground" />
          <h2 className="mt-3 text-base font-extrabold">등록된 레슨이 없습니다.</h2>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {
              "코치와 레슨 정보를 등록하면\n민턴동 공개 페이지에서 회원들이 확인하고 신청할 수 있어요."
            }
          </p>
          <Button className="mt-4 h-11 rounded-2xl" onClick={() => setEditing("new")}>
            첫 레슨 등록하기
          </Button>
        </section>
      ) : (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold">등록된 레슨 {lessons.data.length}개</h2>
            <Button size="sm" className="rounded-xl" onClick={() => setEditing("new")}>
              레슨 등록
            </Button>
          </div>
          <ul className="space-y-2">
            {lessons.data.map((lesson) => (
              <li key={lesson.id} className="rounded-3xl border border-border bg-card p-4">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{lesson.name} 코치</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {lesson.weekdays.map((day) => LESSON_WEEKDAYS[day]).join("·")} ·{" "}
                      {String(lesson.startHour).padStart(2, "0")}:00–
                      {String(lesson.endHour).padStart(2, "0")}:00
                    </p>
                    <p className="mt-1 text-xs font-extrabold text-primary">
                      {won(lesson.priceWon)} / {lesson.durationMin}분
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold " +
                      (lesson.isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {lesson.isActive ? "판매중" : "판매중지"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl"
                    onClick={() => setEditing(lesson)}
                  >
                    <Pencil className="mr-1 size-3.5" /> 수정
                  </Button>
                  <Button
                    variant={lesson.isActive ? "outline" : "default"}
                    className="h-10 rounded-xl"
                    disabled={toggle.isPending}
                    onClick={() =>
                      toggle.mutate({
                        clubId: selected.id,
                        lessonId: lesson.id,
                        isActive: !lesson.isActive,
                      })
                    }
                  >
                    {lesson.isActive ? "판매중지" : "판매 시작"}
                  </Button>
                </div>
                <Button asChild variant="ghost" className="mt-1 h-9 w-full rounded-xl text-xs">
                  <Link to="/clubs/$clubId/lessons" params={{ clubId: selected.id }}>
                    공개 페이지에서 보기 <ExternalLink className="ml-1 size-3" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            <Wallet className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold">정산 설정</h2>
            <p className="mt-0.5 text-xs font-bold text-muted-foreground">정산 상태 · 미연결</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              PortOne Partner 정산 연동 준비 중입니다. 현재 partnerId, 계좌번호, 신분증 정보를
              수집하지 않습니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function LessonEditor({
  clubId,
  lesson,
  onCancel,
  onSaved,
}: {
  clubId: string;
  lesson: ManagedLesson | null;
  onCancel: () => void;
  onSaved: (lesson: ManagedLesson) => Promise<void>;
}) {
  const [value, setValue] = useState<LessonSaleInput>(lesson ?? emptyLesson());
  const [specialties, setSpecialties] = useState(lesson?.specialties.join(", ") ?? "");
  const candidate = { ...value, specialties: specialties.split(",") };
  const validation = validateLessonSale(candidate);
  const save = useMutation({
    mutationFn: () =>
      saveManagedLesson({
        clubId,
        ...(lesson ? { lessonId: lesson.id } : {}),
        lesson: candidate,
      }),
    onSuccess: async (saved) => {
      toast.success("레슨이 등록되었습니다.");
      await onSaved(saved);
    },
    onError: (error) => toast.error(safeLessonError(error)),
  });

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold">{lesson ? "레슨 수정" : "첫 레슨 등록"}</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          닫기
        </Button>
      </div>
      <Field label="코치명">
        <Input
          value={value.name}
          onChange={(event) => setValue((prev) => ({ ...prev, name: event.target.value }))}
        />
      </Field>
      <Field label="코치 소개">
        <Textarea
          rows={3}
          value={value.intro}
          onChange={(event) => setValue((prev) => ({ ...prev, intro: event.target.value }))}
        />
      </Field>
      <Field label="전문 분야" hint="쉼표로 구분">
        <Input
          value={specialties}
          onChange={(event) => setSpecialties(event.target.value)}
          placeholder="예: 복식 로테이션, 스매시"
        />
      </Field>
      <Field label="레슨 대상/레벨">
        <Input
          value={value.levelLabel}
          onChange={(event) => setValue((prev) => ({ ...prev, levelLabel: event.target.value }))}
          placeholder="예: 입문–초급"
        />
      </Field>
      <Field label="레슨 요일">
        <div className="grid grid-cols-7 gap-1">
          {LESSON_WEEKDAYS.map((label, day) => {
            const active = value.weekdays.includes(day);
            return (
              <button
                key={label}
                type="button"
                className={
                  "h-9 rounded-lg text-xs font-bold " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground")
                }
                onClick={() =>
                  setValue((prev) => ({
                    ...prev,
                    weekdays: active
                      ? prev.weekdays.filter((item) => item !== day)
                      : [...prev.weekdays, day],
                  }))
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="시작 시간"
          value={value.startHour}
          min={0}
          max={23}
          onChange={(startHour) => setValue((prev) => ({ ...prev, startHour }))}
        />
        <NumberField
          label="종료 시간"
          value={value.endHour}
          min={1}
          max={24}
          onChange={(endHour) => setValue((prev) => ({ ...prev, endHour }))}
        />
        <NumberField
          label="1회 수업(분)"
          value={value.durationMin}
          min={1}
          step={10}
          onChange={(durationMin) => setValue((prev) => ({ ...prev, durationMin }))}
        />
        <NumberField
          label="1회 가격(원)"
          value={value.priceWon}
          min={1}
          step={1000}
          onChange={(priceWon) => setValue((prev) => ({ ...prev, priceWon }))}
        />
      </div>
      <label className="flex items-center justify-between rounded-xl bg-secondary px-3 py-3 text-xs font-bold">
        판매 상태
        <input
          type="checkbox"
          checked={value.isActive}
          onChange={(event) => setValue((prev) => ({ ...prev, isActive: event.target.checked }))}
          className="size-4 accent-primary"
        />
      </label>
      {!validation.ok ? (
        <p className="whitespace-pre-line text-[11px] text-destructive">
          {validation.errors.join("\n")}
        </p>
      ) : null}
      <Button
        className="h-11 w-full rounded-2xl"
        disabled={!validation.ok || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : lesson ? (
          "수정 저장"
        ) : (
          "레슨 등록"
        )}
      </Button>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold">
        {label}
        {hint ? <span className="ml-1 font-normal text-muted-foreground">({hint})</span> : null}
      </span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={min}
        {...(max === undefined ? {} : { max })}
        {...(step === undefined ? {} : { step })}
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

function MigrationNotice() {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-center">
      <h1 className="text-base font-extrabold">레슨 관리 DB 준비가 필요합니다</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        운영자가 coach lesson management migration을 검토·적용한 뒤 다시 시도해 주세요.
      </p>
    </section>
  );
}

function safeLessonError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("coaches_active_product_valid") || message.includes("check constraint")) {
    return "판매 정보를 모두 올바르게 입력해 주세요.";
  }
  if (message.includes("permission") || message.includes("row-level security")) {
    return "이 클럽의 레슨을 관리할 권한이 없습니다.";
  }
  if (
    message.includes("코치") ||
    message.includes("가격") ||
    message.includes("시간") ||
    message.includes("요일")
  ) {
    return message;
  }
  return "레슨 정보를 저장하지 못했습니다. DB migration과 권한을 확인해 주세요.";
}
