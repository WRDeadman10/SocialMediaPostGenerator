import { MotionDurations, MotionEasing, motionTransition } from "./tokens.js";

export const panelVariants = Object.freeze({
  openLeft: {
    opacity: 1,
    x: 0,
    transition: motionTransition(MotionDurations.panel, MotionEasing.emphasized),
  },
  closedLeft: {
    opacity: 0,
    x: -18,
    transition: motionTransition(MotionDurations.panel, MotionEasing.decel),
  },
  openRight: {
    opacity: 1,
    x: 0,
    transition: motionTransition(MotionDurations.panel, MotionEasing.emphasized),
  },
  closedRight: {
    opacity: 0,
    x: 18,
    transition: motionTransition(MotionDurations.panel, MotionEasing.decel),
  },
});

export const toastVariants = Object.freeze({
  initial: { opacity: 0, x: 14, y: -10, scale: 0.98 },
  animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: motionTransition(MotionDurations.standard, MotionEasing.emphasized) },
  exit: { opacity: 0, x: 14, y: -8, scale: 0.98, transition: motionTransition(MotionDurations.micro, MotionEasing.decel) },
});

export const popVariants = Object.freeze({
  initial: { opacity: 0, scale: 0.98, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: motionTransition(MotionDurations.standard, MotionEasing.emphasized) },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: motionTransition(MotionDurations.micro, MotionEasing.decel) },
});

