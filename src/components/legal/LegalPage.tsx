import type { ReactNode } from "react";

export type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
  title,
  description,
  sections,
  notice,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
  notice?: ReactNode;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
      <header className="brand-header px-5 py-6">
        <p className="text-[11px] font-bold text-primary">민턴동 법적 안내</p>
        <h2 className="mt-1 break-keep text-xl font-extrabold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 break-keep text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        {notice ? (
          <div className="mt-4 rounded-2xl bg-secondary/80 px-3.5 py-3 text-[11px] leading-relaxed text-secondary-foreground">
            {notice}
          </div>
        ) : null}
      </header>

      <div className="divide-y divide-border px-5">
        {sections.map((section, index) => (
          <section key={section.title} className="py-5">
            <h3 className="break-keep text-sm font-extrabold text-foreground">
              {index + 1}. {section.title}
            </h3>
            <div className="mt-2 min-w-0 break-words text-xs leading-6 text-muted-foreground [&_a]:font-bold [&_a]:text-primary [&_li+li]:mt-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
