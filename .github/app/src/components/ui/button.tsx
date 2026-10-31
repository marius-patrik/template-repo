import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const variants = cva("canvas-button", {
  variants: {
    variant: {
      default: "canvas-button-primary",
      ghost: "canvas-button-ghost",
      subtle: "canvas-button-subtle",
    },
    size: { default: "canvas-button-md", icon: "canvas-button-icon" },
  },
  defaultVariants: { variant: "ghost", size: "default" },
});
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & { asChild?: boolean };
export function Button({ className, variant, size, asChild = false, ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return <Component className={twMerge(clsx(variants({ variant, size }), className))} {...props} />;
}
