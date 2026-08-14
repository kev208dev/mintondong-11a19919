import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ClubRouteBackButton } from "@/components/app/ClubRouteBackButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  clubKeys,
  clubMutationErrorMessage,
  createClub,
  validateCreateClubInput,
} from "@/lib/clubs/api";

export const Route = createFileRoute("/clubs/new")({
  head: () => ({
    meta: [
      { title: "동호회 만들기 – 민턴동" },
      { name: "description", content: "새 배드민턴 동호회를 만들고 회원을 모아보세요." },
      { property: "og:title", content: "동호회 만들기 – 민턴동" },
      { property: "og:description", content: "새 배드민턴 동호회 생성." },
    ],
  }),
  component: NewClubPage,
});

function NewClubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading, profileLoading, profileStatus, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", search: { next: "/clubs/new" }, replace: true });
    }
  }, [loading, user, navigate]);

  const submit = async () => {
    if (loading || profileLoading) return;
    if (!user) {
      toast.error("로그인이 필요해요.");
      void navigate({ to: "/auth", search: { next: "/clubs/new" } });
      return;
    }
    const problem = validateCreateClubInput({ name, region });
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const club = await createClub({ name, region, description, isPublic, imageFile: file });
      queryClient.setQueryData(clubKeys.detail(club.id), club);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clubKeys.mine(user.id) }),
        queryClient.invalidateQueries({ queryKey: clubKeys.membership(club.id, user.id) }),
        queryClient.invalidateQueries({ queryKey: clubKeys.members(club.id, user.id) }),
        refreshProfile(),
      ]);
      toast.success("동호회를 만들었어요.");
      void navigate({ to: "/clubs/$clubId", params: { clubId: club.id }, replace: true });
    } catch (error) {
      console.error("[clubs] create failed", error);
      toast.error(clubMutationErrorMessage("create", error));
    } finally {
      setSaving(false);
    }
  };

  if (profileStatus === "error") {
    return (
      <div className="space-y-3">
        <ClubRouteBackButton />
        <section className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-sm font-extrabold text-foreground">계정 정보를 확인하지 못했어요.</p>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="mt-4 h-11 rounded-xl bg-secondary px-4 text-xs font-bold text-secondary-foreground"
          >
            다시 시도
          </button>
        </section>
      </div>
    );
  }

  if (loading || profileLoading || profileStatus !== "ready" || !user) {
    return (
      <div className="space-y-3">
        <ClubRouteBackButton />
        <div className="h-52 animate-pulse rounded-3xl bg-secondary" aria-label="계정 확인 중" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ClubRouteBackButton />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center gap-3 text-left"
      >
        {preview ? (
          <img
            src={preview}
            alt="동호회 프로필 미리보기"
            className="size-16 rounded-2xl object-cover"
          />
        ) : (
          <span className="grid size-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <ImagePlus className="size-5" />
          </span>
        )}
        <span className="text-xs font-bold text-primary">프로필 이미지 선택</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
      />

      <div className="space-y-1.5">
        <label htmlFor="club-name" className="text-xs font-bold text-foreground">
          동호회 이름 <span className="text-destructive">*</span>
        </label>
        <Input
          id="club-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 강남 셔틀콕 클럽"
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="club-region" className="text-xs font-bold text-foreground">
          지역 <span className="text-destructive">*</span>
        </label>
        <Input
          id="club-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="예: 서울 강남구"
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="club-desc" className="text-xs font-bold text-foreground">
          소개
        </label>
        <Textarea
          id="club-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="운동 요일, 실력대, 분위기 등을 적어주세요."
          rows={4}
          className="rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-bold text-foreground">공개 설정</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: true, label: "공개", desc: "검색에 노출" },
            { v: false, label: "비공개", desc: "초대로만 가입" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setIsPublic(o.v)}
              className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                isPublic === o.v
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <span className="block text-sm font-bold">{o.label}</span>
              <span className="block text-[11px] opacity-80">{o.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={saving || !name.trim() || !region.trim()}
        onClick={() => void submit()}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : "만들기"}
      </button>
    </div>
  );
}
