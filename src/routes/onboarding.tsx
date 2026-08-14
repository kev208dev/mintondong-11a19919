import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return <Outlet />;
}
