import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow,border-color,opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_1px_0_oklch(1_0_0_/_0.45)_inset,0_10px_24px_-16px_oklch(0.55_0.13_48_/_0.7)] hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground shadow-[0_1px_0_oklch(1_0_0_/_0.45)_inset] hover:bg-secondary/80',
        outline:
          'border border-input bg-background/55 shadow-[0_1px_0_oklch(1_0_0_/_0.6)_inset] backdrop-blur hover:bg-accent/55 hover:text-accent-foreground',
        ghost: 'hover:bg-accent/50 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'h-9 w-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
