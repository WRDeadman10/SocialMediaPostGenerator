import React from "react";
import { WizardSteps } from "../../lib/validation.js";

export const TopStepper = ({
  status,
  onSelectStep,
}) => {
  const current = status?.currentStepId || "upload";
  return (
    <nav className="top-stepper" aria-label="Workflow steps">
      {WizardSteps.map((step, i) => {
        const can = status?.canAccess?.(step.id) ?? false;
        const active = step.id === current;
        const done = status?.steps?.[step.id]?.done;
        return (
          <button
            key={step.id}
            type="button"
            className={`stepper-step ${active ? "active" : ""} ${done ? "done" : ""}`}
            onClick={() => can && onSelectStep?.(step.id)}
            disabled={!can}
            aria-current={active ? "step" : undefined}
            aria-label={`${step.label}${done ? " completed" : ""}`}
          >
            <span className="stepper-index">{done ? "✓" : i + 1}</span>
            <span className="stepper-label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

