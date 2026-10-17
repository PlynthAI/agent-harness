import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

// 16px text on small screens stops mobile browsers zooming.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-control border border-input bg-card px-3 text-base text-foreground transition-colors duration-(--duration-fast) outline-none placeholder:text-muted-foreground focus-visible:border-ink aria-invalid:focus-visible:border-ink disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-(length:--text-md)",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
