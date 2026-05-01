import React from "react";
import { WizardSteps } from "../../lib/validation.js";
import { motion } from "framer-motion";
import { motionTransition, MotionDurations, MotionEasing } from "../../motion/tokens.js";

export const TopStepper = ({
  status,
  onSelectStep,
}) => {
  const current = status?.currentStepId || "upload";
  const activeIndex = Math.max(0, WizardSteps.findIndex((s) => s.id === current));
  const progress = WizardSteps.length <= 1 ? 0 : (activeIndex / (WizardSteps.length - 1)) * 100;
  return (
    <nav className="top-stepper" aria-label="Workflow steps">
      <div className="stepper-rail" aria-hidden="true">
        <motion.div
          className="stepper-fill"
          initial={false}
          animate={{ scaleX: Math.max(0.02, Math.min(1, progress / 100)) }}
          style={{ transformOrigin: "0 50%" }}
          transition={motionTransition(MotionDurations.standard, MotionEasing.emphasized)}
        />
      </div>
      {WizardSteps.map((step, i) => {
        const can = status?.canAccess?.(step.id) ?? false;
        const active = step.id === current;
        const done = status?.steps?.[step.id]?.done;
        return (
          <motion.button
            key={step.id}
            type="button"
            className={`stepper-step ${active ? "active" : ""} ${done ? "done" : ""}`}
            onClick={() => can && onSelectStep?.(step.id)}
            disabled={!can}
            aria-current={active ? "step" : undefined}
            aria-label={`${step.label}${done ? " completed" : ""}`}
            animate={active ? { scale: 1.05 } : { scale: 1 }}
            transition={motionTransition(MotionDurations.micro, MotionEasing.standard)}
          >
            <span className="stepper-index">{done ? "✓" : i + 1}</span>
            <span className="stepper-label">{step.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};

