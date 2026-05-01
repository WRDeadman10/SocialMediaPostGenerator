import React from "react";
import { motion } from "framer-motion";
import { MotionDurations, MotionEasing, motionTransition } from "../tokens.js";

export const MotionButton = React.forwardRef(({
  className,
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      className={className}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2, transition: motionTransition(MotionDurations.micro, MotionEasing.standard) }}
      whileTap={disabled ? undefined : { scale: 0.96, transition: motionTransition(MotionDurations.micro, MotionEasing.standard) }}
      {...props}
    >
      {children}
    </motion.button>
  );
});

MotionButton.displayName = "MotionButton";

