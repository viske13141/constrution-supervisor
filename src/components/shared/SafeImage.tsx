import * as React from 'react';
import { HardHat } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SafeImageProps {
  src?: string;
  alt: string;
  fallbackLabel?: string;
  className?: string;
}

export function SafeImage({ src, alt, fallbackLabel, className }: SafeImageProps) {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-500 p-3 text-center',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <HardHat className="w-5 h-5 text-slate-400" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
