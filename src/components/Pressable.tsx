import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { pick, springSnappy } from "@/lib/motion";

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  scale?: number;
  "aria-label"?: string;
};

/**
 * Knop met directe feedback: motion's whileTap reageert op pointerdown,
 * niet pas bij loslaten. De spring is onderbreekbaar — loslaten keert
 * de animatie om vanuit de huidige positie.
 */
export function Pressable({
  children,
  className,
  onClick,
  disabled,
  type = "button",
  scale = 0.97,
  ...rest
}: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type={type}
      disabled={!!disabled}
      {...(onClick ? { onClick } : {})}
      {...(rest["aria-label"] ? { "aria-label": rest["aria-label"] } : {})}
      {...(reduced || disabled ? {} : { whileTap: { scale }, whileHover: { scale: 1.012 } })}
      transition={pick(reduced, springSnappy)}
      className={cn(
        "select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
