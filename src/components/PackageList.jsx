import { getPackageColor } from "../utils/colors";

let _id = 1;
export const newPackage = () => ({
  id: `pkg-${_id++}`,
  label: `Package ${_id - 1}`,
  length: 20,
  width: 15,
  height: 10,
  quantity: 1,
});

export default function PackageList({ packages, onChange }) {
  const update = (id, field, val) => {
    onChange(packages.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const remove = (id) => onChange(packages.filter((p) => p.id !== id));

  const add = () => onChange([...packages, newPackage()]);

  return (
    <div className="form-section">
      <div className="section-header">
        <span className="section-icon">🗂️</span>
        <h2>Packages <span className="badge">{packages.length}</span></h2>
        <button className="btn-add" onClick={add}>+ Add</button>
      </div>

      <div className="package-list">
        {packages.map((pkg, idx) => (
          <div key={pkg.id} className="package-card">
            <div className="pkg-color-bar" style={{ background: getPackageColor(idx) }} />
            <div className="pkg-body">
              <div className="pkg-row">
                <input
                  className="pkg-name"
                  value={pkg.label}
                  onChange={(e) => update(pkg.id, "label", e.target.value)}
                  placeholder="Package name"
                />
                <div className="qty-row">
                  <span>Qty</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={pkg.quantity}
                    onChange={(e) => update(pkg.id, "quantity", parseInt(e.target.value) || 1)}
                  />
                </div>
                <button className="btn-remove" onClick={() => remove(pkg.id)}>✕</button>
              </div>

              <div className="dims-row">
                {["length", "width", "height"].map((f) => (
                  <label key={f} className="dim-field">
                    <span>{f[0].toUpperCase()}</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={pkg[f]}
                      onChange={(e) => update(pkg.id, f, parseFloat(e.target.value) || 0)}
                    />
                  </label>
                ))}
                <span className="dim-vol">
                  {(pkg.length * pkg.width * pkg.height).toFixed(0)} cm³
                </span>
              </div>
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <div className="empty-state">No packages yet — click + Add</div>
        )}
      </div>
    </div>
  );
}
