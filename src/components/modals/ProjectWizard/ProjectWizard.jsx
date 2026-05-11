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
  sessionKey = "",
  initialData = null, 
  onSave,
  onUploadData,
  onOpenPicker,
  onUploadFile,
  uploadLoading = {},
  initialStep = 1
}) => {
  const [step, setStep] = React.useState(initialStep);
  
  const [wizardData, setWizardData] = React.useState(initialData || {
    name: "",
    config: { ...defaultConfig },
    rows: [],
  });

  // Initialize data only when opening (or switching projects/mode).
  React.useEffect(() => {
    if (!isOpen) return;
    setStep(initialStep);
    if (initialData) setWizardData(initialData);
  }, [isOpen, initialStep, sessionKey]);

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

  const pickerSpecFor = (kind) => {
    const k = String(kind || "");
    if (k === "logo") return { title: "Primary logo", configKey: "logoDataUrl", pickerKind: "logo", libraryOnly: true };
    if (k === "last-slide-logo") return { title: "Last slide logo", configKey: "lastLogoDataUrl", pickerKind: "last-slide-logo", libraryOnly: true };
    if (k === "background") return { title: "Background image", configKey: "bgDataUrl", pickerKind: "background", libraryOnly: false };
    return { title: "Asset Library", configKey: "", pickerKind: k || "background", libraryOnly: false };
  };

  const handleOpenPicker = (kind) => {
    if (!onOpenPicker) return;
    const spec = pickerSpecFor(kind);
    onOpenPicker({
      title: spec.title,
      kind: spec.pickerKind,
      libraryOnly: spec.libraryOnly,
      applyUrl: async (url) => {
        if (!spec.configKey) return;
        updateConfig({ [spec.configKey]: url });
      },
    });
  };

  const handleUploadFile = async (kind, file) => {
    if (!onUploadFile) return;
    const spec = pickerSpecFor(kind);
    if (!spec.configKey) return;
    const url = await onUploadFile(spec.configKey, spec.pickerKind, file);
    if (url) updateConfig({ [spec.configKey]: url });
  };

  const wizardUploadLoading = {
    logo: uploadLoading?.["sidebar:logo"] || uploadLoading?.logo,
    background: uploadLoading?.["sidebar:background"] || uploadLoading?.background,
    "last-slide-logo": uploadLoading?.["sidebar:last-slide-logo"] || uploadLoading?.["last-slide-logo"],
  };

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
                className={`wizard-step-item ${step === i + 1 ? "active" : ""}`}
                onClick={() => setStep(i + 1)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setStep(i + 1);
                  }
                }}
              >
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
          </header>

          <div className="wizard-content">
            {step === 1 && <StepBasics data={wizardData} updateData={updateData} updateConfig={updateConfig} />}
            {step === 2 && <StepData data={wizardData} onUpload={onUploadData} />}
            {step === 3 && <StepBranding config={wizardData.config} updateConfig={updateConfig} onOpenPicker={handleOpenPicker} onUploadFile={handleUploadFile} uploadLoading={wizardUploadLoading} />}
            {step === 4 && <StepTypography config={wizardData.config} updateConfig={updateConfig} />}
            {step === 5 && <StepColors config={wizardData.config} updateConfig={updateConfig} />}
            {step === 6 && <StepDesign config={wizardData.config} updateConfig={updateConfig} updateBar={updateBar} />}
            {step === 7 && <StepBackgrounds config={wizardData.config} updateConfig={updateConfig} onOpenPicker={handleOpenPicker} onUploadFile={handleUploadFile} uploadLoading={wizardUploadLoading} />}
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
              <button
                type="button"
                className="wizard-btn wizard-btn-secondary"
                onClick={handleNext}
                disabled={step === totalSteps}
                aria-label="Next section"
              >
                Next
              </button>
              <button
                type="button"
                className="wizard-btn wizard-btn-primary wizard-btn-success"
                onClick={() => onSave(wizardData)}
                disabled={!wizardData?.name && (!initialData?.name || !initialData?.name.trim())}
                aria-label="Save project settings"
              >
                Save
              </button>
            </div>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};
