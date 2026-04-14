import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-[180ms] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(15,110,86,0.18)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#0F6E56] text-white border-none hover:bg-[#0C5C47] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(15,110,86,0.25)]",
        destructive:
          "bg-transparent border border-[rgba(220,38,38,0.3)] text-[#DC2626] hover:bg-[rgba(220,38,38,0.06)] hover:border-[rgba(220,38,38,0.5)]",
        outline:
          "border border-[rgba(15,110,86,0.18)] bg-transparent text-[#4A5250] hover:bg-[rgba(15,110,86,0.08)] hover:border-[rgba(15,110,86,0.28)] hover:text-[#0F6E56]",
        secondary:
          "bg-[rgba(15,110,86,0.08)] text-[#0F6E56] hover:bg-[rgba(15,110,86,0.14)]",
        ghost:
          "hover:bg-[rgba(15,110,86,0.08)] hover:text-[#0F6E56]",
        link: "text-[#0F6E56] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-[18px] py-[9px]",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
