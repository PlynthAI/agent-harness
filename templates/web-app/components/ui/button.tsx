import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control border border-transparent bg-clip-padding text-sm font-[520] whitespace-nowrap transition-colors duration-(--duration-fast) outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/85 focus-visible:bg-primary/70",
        outline:
          "border-input bg-card hover:bg-muted focus-visible:border-ink aria-invalid:focus-visible:border-ink aria-expanded:bg-muted",
        secondary: "bg-secondary text-secondary-foreground focus-visible:bg-focus-fill",
        ghost: "text-ink-2 hover:bg-muted hover:text-ink focus-visible:bg-focus-fill",
        destructive:
          "bg-danger-soft text-danger-ink hover:bg-destructive/15 focus-visible:bg-destructive/25",
        link: "text-primary underline-offset-4 hover:underline focus-visible:bg-focus-fill",
      },
      size: {
        default: "h-10 gap-2 px-4",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-11 gap-2 px-5",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
