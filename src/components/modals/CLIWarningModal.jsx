import React from "react";

/**
 * Full-screen CLI warning modal shown on app startup.
 * Shows availability status for each CLI tool with install instructions.
 */
export const CLIWarningModal = ({ cliStatus, onDismiss }) => {
  if (!cliStatus || !cliStatus.length) return null;

  const allAvailable = cliStatus.every((c) => c.available);
  const noneAvailable = cliStatus.every((c) => !c.available);

  return (
    <div className="cli-warning-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && onDismiss?.()}>
      <div className="cli-warning-card" role="dialog" aria-modal="true" aria-label="CLI Tools Status">
        <div className="cli-warning-header">
          <div className="cli-warning-icon" aria-hidden="true">⚡</div>
          <h2 className="cli-warning-title">AI Image Generation</h2>
          <p className="cli-warning-subtitle">
            {allAvailable
              ? "All CLI tools are ready to use!"
              : noneAvailable
              ? "No CLI tools detected. Install at least one to generate images."
              : "Some CLI tools are missing. Install them to enable more options."}
          </p>
        </div>

        <div className="cli-warning-list">
          {cliStatus.map((cli) => (
            <div
              key={cli.id}
              className={`cli-status-row ${cli.available ? "cli-status-available" : "cli-status-missing"}`}
            >
              <div className="cli-status-indicator">
                {cli.available ? (
                  <span className="cli-check" aria-label="Available">✅</span>
                ) : (
                  <span className="cli-cross" aria-label="Not installed">❌</span>
                )}
              </div>
              <div className="cli-status-info">
                <div className="cli-status-name">
                  {cli.name}
                  {cli.available && cli.version && (
                    <span className="cli-status-version">{cli.version}</span>
                  )}
                </div>
                {cli.available ? (
                  <div className="cli-status-ready">Ready to use</div>
                ) : (
                  <div className="cli-status-install">
                    <div className="cli-status-install-label">Install:</div>
                    <code className="cli-status-install-cmd">{cli.installCmd}</code>
                    {cli.authNote && (
                      <div className="cli-status-auth-note">
                        <span className="cli-auth-icon" aria-hidden="true">🔑</span>
                        {cli.authNote.split("\n").map((line, i) => (
                          <span key={i}>
                            {i > 0 && <br />}
                            {line}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="cli-warning-footer">
          <button
            type="button"
            className="cli-warning-continue-btn"
            onClick={onDismiss}
            autoFocus
          >
            Continue to App
          </button>
          {!allAvailable && (
            <p className="cli-warning-hint">
              You can still use the app — image generation will only work with installed tools.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
