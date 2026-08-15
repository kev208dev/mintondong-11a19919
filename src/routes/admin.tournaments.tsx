import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Pencil, Plus, Search, ShieldAlert, Trophy } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlacePicker } from "@/components/places/PlacePicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  createAdminTournament,
  getAdminTournaments,
  setAdminTournamentActive,
  updateAdminTournament,
} from "@/lib/tournaments/admin.functions";
import {
  validateManualTournamentInput,
  type AdminTournament,
  type ManualTournamentFieldErrors,
  type ManualTournamentInput,
} from "@/lib/tournaments/admin-core";
import { formatTournamentPeriod, tournamentStatusLabel } from "@/lib/tournaments/format";
import type { Place } from "@/lib/places/types";

export const Route = createFileRoute("/admin/tournaments")({
  head: () => ({
    meta: [{ title: "대회 관리 – 민턴동" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminTournamentsPage,
});

type Draft = {
  title: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  region: string;
  city: string;
  venue: string;
  venueAddress: string;
  place: Place | null;
  scope: "NATIONAL" | "LOCAL";
  organizer: string;
  host: string;
  entryFeeWon: string;
  posterUrl: string;
  description: string;
  registrationUrl: string;
  sourceUrl: string;
  bracketUrl: string;
  resultUrl: string;
};

const emptyDraft = (): Draft => ({
  title: "",
  startDate: "",
  endDate: "",
  registrationStartDate: "",
  registrationEndDate: "",
  region: "",
  city: "",
  venue: "",
  venueAddress: "",
  place: null,
  scope: "LOCAL",
  organizer: "",
  host: "",
  entryFeeWon: "",
  posterUrl: "",
  description: "",
  registrationUrl: "",
  sourceUrl: "",
  bracketUrl: "",
  resultUrl: "",
});

function draftFromTournament(item: AdminTournament): Draft {
  return {
    title: item.title,
    startDate: item.startDate,
    endDate: item.endDate,
    registrationStartDate: item.registrationStartDate ?? "",
    registrationEndDate: item.registrationEndDate ?? "",
    region: item.region,
    city: item.city,
    venue: item.venue,
    venueAddress: item.venueAddress ?? "",
    place: null,
    scope: item.scope,
    organizer: item.organizer ?? "",
    host: item.host ?? "",
    entryFeeWon: item.entryFeeWon == null ? "" : String(item.entryFeeWon),
    posterUrl: item.posterUrl ?? "",
    description: item.description ?? "",
    registrationUrl: item.registrationUrl ?? "",
    sourceUrl: item.sourceUrl ?? "",
    bracketUrl: item.bracketUrl ?? "",
    resultUrl: item.resultUrl ?? "",
  };
}

function validateDraft(draft: Draft) {
  return validateManualTournamentInput({
    ...draft,
    entryFeeWon:
      draft.entryFeeWon.trim() === "" ? null : Number(draft.entryFeeWon.replaceAll(",", "")),
  });
}

function sourceLabel(source: AdminTournament["source"]) {
  return (
    {
      MANUAL: "민턴동 등록",
      FACECOCK: "Facecock",
      COURTX: "CourtX",
      BKPLAY: "BKPLAY",
      KOC: "스포츠지원포털",
    } as const
  )[source];
}

function AdminTournamentsPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminTournament | "new" | null>(null);
  const tournaments = useQuery({
    queryKey: ["admin", "tournaments"],
    queryFn: () => getAdminTournaments(),
    enabled: Boolean(user),
    retry: false,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments"] }),
      queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
    ]);
  };

  const activeMutation = useMutation({
    mutationFn: (input: { tournamentId: string; isActive: boolean }) =>
      setAdminTournamentActive({ data: input }),
    onSuccess: async (result) => {
      await refresh();
      toast.success(result.isActive ? "대회를 다시 공개했습니다." : "대회를 비활성화했습니다.");
    },
    onError: () => toast.error("대회 공개 상태를 변경하지 못했습니다."),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    if (!query) return tournaments.data ?? [];
    return (tournaments.data ?? []).filter((item) =>
      [item.title, item.region, item.city, item.venue]
        .join(" ")
        .toLocaleLowerCase("ko-KR")
        .includes(query),
    );
  }, [search, tournaments.data]);

  if (loading) return <Loader2 className="mx-auto mt-16 size-7 animate-spin text-primary" />;
  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="관리자 계정으로 로그인한 뒤 대회 관리 페이지를 이용해 주세요."
      >
        <Button asChild className="mt-4 h-11 rounded-xl">
          <Link to="/auth" search={{ next: "/admin/tournaments" }}>
            관리자 로그인
          </Link>
        </Button>
      </AccessNotice>
    );
  }
  if (tournaments.isLoading) {
    return <Loader2 className="mx-auto mt-16 size-7 animate-spin text-primary" />;
  }
  if (tournaments.isError) {
    return (
      <AccessNotice
        title="관리자 권한이 필요합니다"
        description="현재 계정은 대회 관리자 권한이 없거나 운영 DB migration이 아직 적용되지 않았습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-bold text-primary">MANUAL source 운영</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold">관리자 대회 관리</h2>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Facecock과 CourtX 자동 수집은 비활성 상태입니다. 저장한 수동 대회는 공개 목록에 즉시
              반영됩니다.
            </p>
          </div>
          <Button size="sm" className="shrink-0 rounded-xl" onClick={() => setEditing("new")}>
            <Plus className="mr-1 size-3.5" /> 등록
          </Button>
        </div>
      </section>

      {editing ? (
        <TournamentEditor
          key={editing === "new" ? "new" : editing.id}
          tournament={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="대회명, 지역, 경기장 검색"
          aria-label="관리 대회 검색"
          className="h-11 rounded-xl bg-card pl-9"
        />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold">등록 대회 {filtered.length}건</h2>
          <span className="text-[10.5px] text-muted-foreground">비활성 포함</span>
        </div>
        {filtered.length ? (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span className="rounded-md bg-secondary px-1.5 py-0.5">
                        {sourceLabel(item.source)}
                      </span>
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">
                        {tournamentStatusLabel(item.status)}
                      </span>
                      {!item.isActive ? (
                        <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-destructive">
                          비활성
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 break-words text-sm font-extrabold leading-5">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {formatTournamentPeriod(item.startDate, item.endDate)} · {item.region}{" "}
                      {item.city}
                      <br />
                      {item.venue}
                    </p>
                  </div>
                  {item.isActive ? (
                    <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
                      <Link
                        to="/tournaments/$tournamentId"
                        params={{ tournamentId: item.id }}
                        aria-label="공개 상세 보기"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="h-9 rounded-xl text-xs"
                    disabled={item.source !== "MANUAL"}
                    onClick={() => setEditing(item)}
                  >
                    <Pencil className="mr-1 size-3.5" /> 수정
                  </Button>
                  <Button
                    variant={item.isActive ? "outline" : "default"}
                    className="h-9 rounded-xl text-xs"
                    disabled={item.source !== "MANUAL" || activeMutation.isPending}
                    onClick={() => {
                      const message = item.isActive
                        ? "이 대회를 비활성화하면 공개 목록과 상세에서 숨겨집니다. 계속할까요?"
                        : "이 대회를 다시 공개할까요?";
                      if (window.confirm(message)) {
                        activeMutation.mutate({ tournamentId: item.id, isActive: !item.isActive });
                      }
                    }}
                  >
                    {item.isActive ? "비활성" : "다시 공개"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-7 text-center">
            <Trophy className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-extrabold">등록된 대회가 없습니다.</p>
            <Button className="mt-3 rounded-xl" size="sm" onClick={() => setEditing("new")}>
              첫 대회 등록
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function AccessNotice({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-7 text-center">
      <ShieldAlert className="mx-auto size-7 text-muted-foreground" />
      <h2 className="mt-3 text-base font-extrabold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

function TournamentEditor({
  tournament,
  onCancel,
  onSaved,
}: {
  tournament: AdminTournament | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(
    tournament ? draftFromTournament(tournament) : emptyDraft(),
  );
  const [errors, setErrors] = useState<ManualTournamentFieldErrors>({});

  const save = useMutation({
    mutationFn: (value: ManualTournamentInput) =>
      tournament
        ? updateAdminTournament({
            data: { tournamentId: tournament.id, tournament: value },
          })
        : createAdminTournament({ data: value }),
    onSuccess: async () => {
      toast.success(tournament ? "대회 정보를 수정했습니다." : "대회를 등록했습니다.");
      await onSaved();
    },
    onError: () => toast.error("대회를 저장하지 못했습니다. 입력값과 관리자 권한을 확인해 주세요."),
  });

  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const checked = validateDraft(draft);
    if (!checked.ok) {
      setErrors(checked.errors);
      toast.error("입력한 대회 정보를 확인해 주세요.");
      return;
    }
    save.mutate(checked.value);
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-primary/30 bg-card p-4">
      <div>
        <p className="text-[11px] font-bold text-primary">source · 민턴동 등록</p>
        <h2 className="mt-1 text-base font-extrabold">
          {tournament ? "대회 정보 수정" : "새 대회 등록"}
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          상태는 입력한 대회·접수 날짜를 기준으로 자동 계산됩니다.
        </p>
      </div>

      <FormField label="대회명" required error={errors.title}>
        <Input value={draft.title} onChange={(event) => set("title", event.target.value)} />
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="대회 시작일" required error={errors.startDate}>
          <Input
            type="date"
            value={draft.startDate}
            onChange={(event) => set("startDate", event.target.value)}
          />
        </FormField>
        <FormField label="대회 종료일" required error={errors.endDate}>
          <Input
            type="date"
            value={draft.endDate}
            onChange={(event) => set("endDate", event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="접수 시작일" error={errors.registrationStartDate}>
          <Input
            type="date"
            value={draft.registrationStartDate}
            onChange={(event) => set("registrationStartDate", event.target.value)}
          />
        </FormField>
        <FormField label="접수 종료일" error={errors.registrationEndDate}>
          <Input
            type="date"
            value={draft.registrationEndDate}
            onChange={(event) => set("registrationEndDate", event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="지역" required error={errors.region}>
          <Input
            value={draft.region}
            placeholder="예: 서울"
            onChange={(event) => set("region", event.target.value)}
          />
        </FormField>
        <FormField label="도시" required error={errors.city}>
          <Input
            value={draft.city}
            placeholder="예: 송파구"
            onChange={(event) => set("city", event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="경기장" required error={errors.venue}>
        <PlacePicker
          value={draft.place}
          legacyLabel={draft.place ? null : draft.venue || null}
          onChange={(place) => {
            set("place", place);
            set("venue", place.name);
            set("venueAddress", place.roadAddress ?? place.jibunAddress ?? "");
          }}
        />
      </FormField>

      <FormField label="대회 구분" required error={errors.scope}>
        <select
          value={draft.scope}
          onChange={(event) => set("scope", event.target.value as Draft["scope"])}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="LOCAL">지역대회</option>
          <option value="NATIONAL">전국대회</option>
        </select>
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="주최" error={errors.organizer}>
          <Input
            value={draft.organizer}
            onChange={(event) => set("organizer", event.target.value)}
          />
        </FormField>
        <FormField label="주관" error={errors.host}>
          <Input value={draft.host} onChange={(event) => set("host", event.target.value)} />
        </FormField>
      </div>

      <FormField label="참가비(원)" error={errors.entryFeeWon}>
        <Input
          inputMode="numeric"
          value={draft.entryFeeWon}
          placeholder="예: 30000"
          onChange={(event) => set("entryFeeWon", event.target.value)}
        />
      </FormField>

      <FormField label="포스터 URL" error={errors.posterUrl}>
        <Input
          type="url"
          value={draft.posterUrl}
          placeholder="https://"
          onChange={(event) => set("posterUrl", event.target.value)}
        />
      </FormField>
      <FormField label="설명" error={errors.description}>
        <Textarea
          value={draft.description}
          rows={5}
          onChange={(event) => set("description", event.target.value)}
        />
      </FormField>

      <div className="space-y-3 rounded-xl bg-secondary/60 p-3">
        <p className="text-xs font-extrabold">외부 링크</p>
        <FormField label="참가신청 URL" error={errors.registrationUrl}>
          <Input
            type="url"
            value={draft.registrationUrl}
            placeholder="https://"
            onChange={(event) => set("registrationUrl", event.target.value)}
          />
        </FormField>
        <FormField label="대회 홈페이지 URL" error={errors.sourceUrl}>
          <Input
            type="url"
            value={draft.sourceUrl}
            placeholder="https://"
            onChange={(event) => set("sourceUrl", event.target.value)}
          />
        </FormField>
        <FormField label="대진표 URL" error={errors.bracketUrl}>
          <Input
            type="url"
            value={draft.bracketUrl}
            placeholder="https://"
            onChange={(event) => set("bracketUrl", event.target.value)}
          />
        </FormField>
        <FormField label="결과 URL" error={errors.resultUrl}>
          <Input
            type="url"
            value={draft.resultUrl}
            placeholder="https://"
            onChange={(event) => set("resultUrl", event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" className="h-11 rounded-xl" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
          저장
        </Button>
      </div>
    </form>
  );
}

function FormField({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 text-[11px] font-bold text-foreground">
      <span>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </span>
      <span className="mt-1 block">{children}</span>
      {error ? <span className="mt-1 block font-medium text-destructive">{error}</span> : null}
    </label>
  );
}
