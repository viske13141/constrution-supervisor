import * as React from 'react';

interface PageHeaderProps {
  title: string;
  metadata?: string[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, metadata, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#101F35] tracking-tight">
          {title}
        </h1>
        {metadata && metadata.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-[#64748B]">
            {metadata.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
