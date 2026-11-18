import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MinusCircle,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_MAP: Array<{ match: RegExp; tone: Tone; icon: typeof CheckCircle2 }> = [
  {
    match: /^(present|completed|approved|fully received|accepted|operational|resolved|closed|verified|captured|inside site|available)$/i,
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    match: /^(in progress|submitted|assigned|ordered|currently working|under review|info)$/i,
    tone: 'info',
    icon: Clock,
  },
  {
    match: /^(late|pending|awaiting|partially|missing checkout|submitted for review|warning|medium|high|action required|urgent|correction requested|temporarily unavailable|boundary)$/i,
    tone: 'warning',
    icon: AlertTriangle,
  },
  {
    match: /^(absent|blocked|rejected|damaged|disputed|critical|outside|missing|not checked in|unavailable|rework)$/i,
    tone: 'danger',
    icon: XCircle,
  },
];

function resolveTone(label: string, explicitTone?: Tone): { tone: Tone; Icon: typeof CheckCircle2 } {
  if (explicitTone) {
    const iconByTone: Record<Tone, typeof CheckCircle2> = {
      success: CheckCircle2,
      warning: AlertTriangle,
      danger: ShieldAlert,
      info: Clock,
      neutral: MinusCircle,
    };
    return { tone: explicitTone, Icon: iconByTone[explicitTone] };
  }
  const found = TONE_MAP.find((entry) => entry.match.test(label.trim()));
  if (found) return { tone: found.tone, Icon: found.icon };
  if (/pending/i.test(label)) return { tone: 'warning', Icon: Clock };
  if (/rejected|fail|error|danger|critical/i.test(label)) return { tone: 'danger', Icon: XCircle };
  return { tone: 'neutral', Icon: MinusCircle };
}

const TONE_STYLES: Record<Tone, string> = {
  success: 'text-[#15803D] bg-emerald-50 border-emerald-200',
  warning: 'text-[#B45309] bg-amber-50 border-amber-200',
  danger: 'text-[#B91C1C] bg-red-50 border-red-200',
  info: 'text-[#1D4ED8] bg-blue-50 border-blue-200',
  neutral: 'text-slate-700 bg-slate-100 border-slate-200',
};

export function StatusIndicator({
  label,
  tone,
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  const { tone: resolved, Icon } = resolveTone(label, tone);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0',
        TONE_STYLES[resolved],
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
