export const MotionDurations = Object.freeze({
  micro: 0.12, // 120ms
  standard: 0.24, // 200–300ms
  panel: 0.36, // 300–400ms
});

export const MotionEasing = Object.freeze({
  standard: [0.2, 0.9, 0.2, 1],
  emphasized: [0.16, 1, 0.3, 1],
  decel: [0, 0, 0.2, 1],
});

export const motionTransition = (duration, easing = MotionEasing.standard) => ({
  type: "tween",
  duration,
  ease: easing,
});

