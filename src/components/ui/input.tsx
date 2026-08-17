import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-base text-foreground",
          "placeholder:text-muted-foreground/70 shadow-inner",
          "transition-colors focus-visible:outline-none focus-visible:border-brand/60 focus-visible:ring-4 focus-visible:ring-brand/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
