import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border bg-white px-[13px] py-[9px] text-sm text-[#1A1916] transition-[border-color,box-shadow] duration-[180ms]",
          "border-[rgba(15,110,86,0.18)]",
          "placeholder:text-[#8A9490]",
          "hover:border-[rgba(15,110,86,0.28)]",
          "focus-visible:outline-none focus-visible:border-[#0F6E56] focus-visible:shadow-[0_0_0_3px_rgba(15,110,86,0.18)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
