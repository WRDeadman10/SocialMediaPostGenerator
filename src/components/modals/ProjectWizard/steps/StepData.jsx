import React from "react";
import { downloadTemplate } from "../../../../lib/excelTemplates.js";

export const StepData = ({ data, updateData, onUpload }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <div className="wizard-step-data">
      <div className="data-source-options">
        <label 
          className={`data-drop-zone ${isDragging ? "dragging" : ""} ${data.rows.length ? "has-data" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0]);
          }}
        >
          <input 
            type="file" 
            hidden 
            accept=".xlsx,.xls,.csv" 
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <div className="drop-zone-icon">📊</div>
          <div className="drop-zone-text">
            <strong>{data.rows.length ? "Excel Data Loaded" : "Click or drag Excel/CSV"}</strong>
            <span>{data.rows.length ? `${data.rows.length} rows detected` : "Upload your campaign data to continue"}</span>
          </div>
          {data.rows.length > 0 && (
             <div className="data-check-badge">✓ Verified</div>
          )}
        </label>
      </div>

      <div className="data-templates">
        <span className="templates-label">Don't have a file? Download a template:</span>
        <div className="template-btns">
          <button onClick={() => downloadTemplate("single")}>Single Post Template</button>
          <button onClick={() => downloadTemplate("carousel")}>Carousel Template</button>
        </div>
      </div>

      {data.rows.length > 0 && (
        <div className="data-preview">
          <span className="preview-label">Data Preview (First 3 rows)</span>
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  {Object.keys(data.rows[0] || {}).slice(0, 4).map(k => <th key={k}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 3).map((r, i) => (
                  <tr key={i}>
                    {Object.values(r).slice(0, 4).map((v, j) => <td key={j}>{String(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
