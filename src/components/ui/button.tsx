import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-xs',
        navy: 'bg-[#101F35] text-white hover:bg-[#1B3152] shadow-xs',
        amber: 'bg-[#F59E0B] text-[#101F35] hover:bg-[#D97706] hover:text-white shadow-xs',
        outline:
          'border border-slate-300 bg-white text-[#172B4D] hover:bg-slate-50',
        ghost: 'text-[#172B4D] hover:bg-slate-100',
        danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C]',
        success: 'bg-[#16A34A] text-white hover:bg-[#15803D]',
      },
      size: {
        default: 'min-h-[40px] px-4 py-2',
        sm: 'min-h-[36px] px-3 py-1.5 text-xs',
        lg: 'min-h-[44px] px-5 py-2.5 text-sm',
        icon: 'h-10 w-10 min-w-[40px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = 'Button';
