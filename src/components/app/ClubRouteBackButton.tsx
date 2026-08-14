import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { goBackOrFallback, resolveClubRouteBackFallback } from "@/lib/navigation/club-route-back";

export function ClubRouteBackButton() {
  const navigate = useNavigate();
  const router = useRouter();
  const { user, profile, profileStatus } = useAuth();

  const handleBack = () => {
    const fallback = resolveClubRouteBackFallback({
      authenticated: Boolean(user),
      profileReady: profileStatus === "ready",
      onboardingCompletedAt: profile?.onboarding_completed_at,
    });

    goBackOrFallback(router.history, () => {
      void navigate({ to: fallback, replace: true });
    });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="이전 화면으로 돌아가기"
      className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-xl px-2 text-sm font-bold text-primary transition-colors active:bg-primary/10"
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
      뒤로
    </button>
  );
}
