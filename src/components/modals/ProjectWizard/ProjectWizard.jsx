import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { defaultConfig } from "../../../lib/constants.js";

import { StepBasics } from "./steps/StepBasics.jsx";
import { StepData } from "./steps/StepData.jsx";
import { StepBranding } from "./steps/StepBranding.jsx";
import { StepTypography } from "./steps/StepTypography.jsx";
import { StepColors } from "./steps/StepColors.jsx";
import { StepDesign } from "./steps/StepDesign.jsx";
import { StepBackgrounds } from "./steps/StepBackgrounds.jsx";
import { StepReview } from "./steps/StepReview.jsx";

export const ProjectWizard = ({ 
  isOpen, 
  onClose, 
  initialData = null, 
  onSave,
  onUploadData,
  onOpenPicker,
  onUploadFile,
  uploadLoading = {},
  initialStep = 1
}) => {
  const [step, setStep] = React.useState(initialStep);
  
  // Update step if initialStep changes while open
  React.useEffect(() => {
    if (isOpen) setStep(initialStep);
  }, [isOpen, initialStep]);

  const [wizardData, setWizardData] = React.useState(initialData || {
    name: "",
    config: { ...defaultConfig },
    rows: [],
  });

  // Sync data when modal opens with new initialData
  React.useEffect(() => {
    if (isOpen && initialData) {
      setWizardData(initialData);
    }
  }, [isOpen, initialData]);

  // Sync rows if they change via parent upload (StepData)
  React.useEffect(() => {
    if (initialData?.rows) {
      setWizardData(prev => ({ ...prev, rows: initialData.rows }));
    }
  }, [initialData?.rows]);

  const totalSteps = 8;
  const handleNext = () => setStep((s) => Math.min(s + 1, totalSteps));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const updateData = (patch) => {
    setWizardData((prev) => ({ ...prev, ...patch }));
  };

  const updateConfig = (patch) => {
    setWizardData((prev) => ({
      ...prev,
      config: { ...prev.config, ...patch }
    }));
  };

  const updateBar = (index, patch) => {
    setWizardData((prev) => ({
      ...prev,
      config: { 
        ...prev.config, 
        bars: prev.config.bars.map((bar, i) => (i === index ? { ...bar, ...patch } : bar)) 
      }
    }));
  };

  if (!isOpen) return null;

  const stepLabels = [
    "Project Basics",
    "Data Source",
    "Branding",
    "Typography",
    "Colors",
    "Design System",
    "Backgrounds",
    "Preview & Save"
  ];

  return (
    <div className="modal-overlay wizard-overlay">
      <motion.div 
        className="wizard-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        <div className="wizard-sidebar">
          <div className="wizard-sidebar-header">
            <span className="wizard-sidebar-title">Project Setup</span>
            <span className="wizard-sidebar-subtitle">Configure your production pipeline</span>
          </div>
          
          <div className="wizard-steps">
            {stepLabels.map((label, i) => (
              <div 
                key={i} 
                className={`wizard-step-item ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "completed" : ""}`}
                onClick={() => i + 1 < step && setStep(i + 1)}
              >
                <div className="step-number">{step > i + 1 ? "✓" : i + 1}</div>
                <div className="step-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="wizard-sidebar-footer">
            <button className="wizard-cancel-btn" onClick={onClose}>Cancel Setup</button>
          </div>
        </div>

        <div className="wizard-main">
          <header className="wizard-header">
            <h2>{stepLabels[step - 1]}</h2>
            <div className="step-indicator">Step {step} of {totalSteps}</div>
          </header>

          <div className="wizard-content">
            {step === 1 && <StepBasics data={wizardData} updateData={updateData} updateConfig={updateConfig} />}
            {step === 2 && <StepData data={wizardData} onUpload={onUploadData} />}
            {step === 3 && <StepBranding config={wizardData.config} updateConfig={updateConfig} onOpenPicker={onOpenPicker} onUploadFile={onUploadFile} uploadLoading={uploadLoading} />}
            {step === 4 && <StepTypography config={wizardData.config} updateConfig={updateConfig} />}
            {step === 5 && <StepColors config={wizardData.config} updateConfig={updateConfig} />}
            {step === 6 && <StepDesign config={wizardData.config} updateConfig={updateConfig} updateBar={updateBar} />}
            {step === 7 && <StepBackgrounds config={wizardData.config} updateConfig={updateConfig} onOpenPicker={onOpenPicker} onUploadFile={onUploadFile} uploadLoading={uploadLoading} />}
            {step === 8 && <StepReview data={wizardData} />}
          </div>

          <footer className="wizard-footer">
            <button 
              className="wizard-btn wizard-btn-secondary" 
              onClick={handlePrev}
              disabled={step === 1}
            >
              Back
            </button>
            
            <div className="wizard-footer-right">
              {step < totalSteps ? (
                <button 
                  className="wizard-btn wizard-btn-primary" 
                  onClick={handleNext}
                  disabled={step === 1 && !wizardData.name}
                >
                  Continue
                </button>
              ) : (
                <button 
                  className="wizard-btn wizard-btn-primary wizard-btn-success" 
                  onClick={() => onSave(wizardData)}
                >
                  Finalize Project
                </button>
              )}
            </div>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};
