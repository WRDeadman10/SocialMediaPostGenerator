export const WizardSteps = [
  { id: "upload", label: "Upload Data" },
  { id: "branding", label: "Configure Branding" },
  { id: "layout", label: "Adjust Layout" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" },
];

export const getWizardStatus = ({ activeProjectId, rows, config, generated }) => {
  const hasProject = !!activeProjectId;
  const hasRows = (rows?.length || 0) > 0;
  const hasBranding = !!(config?.bgDataUrl && String(config.bgDataUrl).trim() && config?.logoDataUrl && String(config.logoDataUrl).trim());
  const hasTypography = !!(config?.fontTitle && config?.fontPara && config?.fontCta);
  const hasGenerated = (Object.keys(generated || {}).length || 0) > 0;

  const steps = {
    upload: {
      done: hasProject && hasRows,
      blockers: [
        ...(!hasProject ? ["Select or create a project"] : []),
        ...(!hasRows ? ["Upload an Excel file"] : []),
      ],
    },
    branding: {
      done: hasBranding && hasTypography,
      blockers: [
        ...(!hasBranding ? ["Set background + logo"] : []),
        ...(!hasTypography ? ["Choose fonts"] : []),
      ],
    },
    layout: { done: true, blockers: [] },
    preview: { done: hasGenerated, blockers: [...(!hasGenerated ? ["Generate posts"] : [])] },
    export: { done: hasGenerated, blockers: [...(!hasGenerated ? ["Generate posts"] : [])] },
  };

  const currentStepId = !steps.upload.done
    ? "upload"
    : !steps.branding.done
      ? "branding"
      : !steps.preview.done
        ? "preview"
        : "export";

  const canAccess = (id) => {
    const order = WizardSteps.map((s) => s.id);
    const idx = order.indexOf(id);
    const currentIdx = order.indexOf(currentStepId);
    if (idx <= currentIdx) return true;
    if (id === "layout") return steps.upload.done && steps.branding.done;
    if (id === "preview") return steps.upload.done && steps.branding.done;
    if (id === "export") return steps.upload.done && steps.branding.done && steps.preview.done;
    return false;
  };

  return {
    currentStepId,
    steps,
    canAccess,
  };
};

