import type { Transition } from "motion/react";

/**
 * Spring presets. Default is critically damped: settles quickly, no overshoot.
 * Springs are interruptible by design — motion re-targets from current velocity
 * instead of restarting, so nothing "jumps" mid-gesture.
 */
export const springCalm: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 42,
  mass: 1,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 620,
  damping: 38,
  mass: 0.7,
};

/** Only for interactions with momentum (drag / swipe / sheets). */
export const springMomentum: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 24,
  mass: 0.9,
};

export const crossFade: Transition = { duration: 0.18, ease: "linear" };

export function pick(reduced: boolean | null, spring: Transition): Transition {
  return reduced ? crossFade : spring;
}
