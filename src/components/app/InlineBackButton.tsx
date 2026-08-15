import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { goBackOrFallback } from "@/lib/navigation/club-route-back";

export function InlineBackButton({
  fallback,
  label = "뒤로",
}: {
  fallback: "/tournaments" | "/";
  label?: string;
}) {
  const navigate = useNavigate();
  const router = useRouter();

  const handleBack = () => {
    goBackOrFallback(router.history, () => {
      void navigate({ to: fallback, replace: true });
    });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={`${label} 화면으로 돌아가기`}
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-bold text-primary transition-colors active:bg-primary/10"
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
      {label}
    </button>
  );
}
