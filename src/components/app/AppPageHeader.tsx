import type { ReactNode } from "react";
import { InlineBackButton } from "./InlineBackButton";

export function AppPageHeader({
  title,
  backLabel = title,
  fallback = "/",
  action,
}: {
  title: string;
  backLabel?: string;
  fallback?: "/tournaments" | "/club" | "/";
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-11 items-center gap-2">
      <InlineBackButton fallback={fallback} label={backLabel} />
      {backLabel !== title ? (
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
      ) : null}
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </header>
  );
}
