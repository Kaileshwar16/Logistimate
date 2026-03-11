import { useState } from "react";

export default function ContainerForm({ value, onChange }) {
  const handleChange = (field) => (e) => {
    const v = parseFloat(e.target.value) || 0;
    onChange({ ...value, [field]: v });
  };

  return (
    <div className="form-section">
      <div className="section-header">
        <span className="section-icon">📦</span>
        <h2>Container</h2>
      </div>
      <div className="field-grid">
        {["length", "width", "height"].map((field) => (
          <label key={field} className="field-label">
            <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
            <input
              type="number"
              min="1"
              step="0.1"
              value={value[field] || ""}
              onChange={handleChange(field)}
              placeholder="0"
            />
            <span className="unit">cm</span>
          </label>
        ))}
      </div>
      <div className="container-preview">
        <span>Vol: {((value.length || 0) * (value.width || 0) * (value.height || 0)).toLocaleString()} cm³</span>
      </div>
    </div>
  );
}
