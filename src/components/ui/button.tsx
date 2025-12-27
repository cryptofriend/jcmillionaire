import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-button hover:shadow-glow hover:scale-105",
        destructive:
          "bg-destructive text-destructive-foreground shadow-button hover:bg-destructive/90",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-primary/10",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/80",
        ghost: 
          "hover:bg-secondary hover:text-secondary-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
        gold:
          "gradient-gold text-primary-foreground shadow-button hover:shadow-glow hover:scale-105",
        success:
          "gradient-success text-white shadow-button hover:scale-105",
        danger:
          "gradient-danger text-white shadow-button hover:scale-105",
        answer:
          "bg-card border-2 border-border text-foreground shadow-card hover:border-primary hover:bg-secondary transition-all",
        "answer-selected":
          "bg-primary/10 border-2 border-primary text-foreground shadow-soft",
        "answer-correct":
          "bg-success border-2 border-success text-white shadow-soft animate-blink-success",
        "answer-wrong":
          "bg-destructive border-2 border-destructive text-white shadow-soft animate-blink-danger",
        lifeline:
          "bg-card border-2 border-border text-foreground shadow-card hover:border-primary hover:bg-secondary/50 flex-col gap-1",
        "lifeline-used":
          "bg-muted border-2 border-muted text-muted-foreground cursor-not-allowed opacity-50",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-sm rounded-lg",
        lg: "h-14 px-8 py-4 text-lg rounded-2xl",
        xl: "h-16 px-10 py-5 text-xl rounded-2xl",
        icon: "h-12 w-12",
        answer: "h-auto min-h-14 px-5 py-4 text-left",
        lifeline: "h-auto w-20 px-3 py-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
