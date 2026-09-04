import type { PropsWithChildren } from "react";

interface PanelProps extends PropsWithChildren {
  className?: string;
}

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={`w-full rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      {children}
    </section>
  );
}
