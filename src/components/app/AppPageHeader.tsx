import type { ReactNode } from "react";
import { InlineBackButton } from "./InlineBackButton";

export function AppPageHeader({
  title,
  fallback = "/",
  action,
}: {
  title: string;
  fallback?: "/tournaments" | "/";
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-11 items-center gap-2">
      <InlineBackButton fallback={fallback} label={title} />
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </header>
  );
}
