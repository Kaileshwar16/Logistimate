import { getPackageColor } from "../utils/colors";

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ "--accent": accent }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function ResultsPanel({ result, packages, container }) {
  if (!result) return null;

  const util = (result.utilization * 100).toFixed(1);
  const placedCount = result.placements.length;
  const totalPackages = packages.reduce((s, p) => s + (p.quantity || 1), 0);
  const unplacedCount = result.unplaced.length;

  // Group placements by baseId
  const grouped = {};
  result.placements.forEach((p) => {
    if (!grouped[p.baseId]) grouped[p.baseId] = [];
    grouped[p.baseId].push(p);
  });

  return (
    <div className="results-panel">
      <div className="section-header">
        <span className="section-icon">📊</span>
        <h2>Results</h2>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <StatCard
          label="Utilization"
          value={`${util}%`}
          sub={`${result.usedVol.toLocaleString()} / ${result.containerVol.toLocaleString()} cm³`}
          accent="#4ECDC4"
        />
        <StatCard
          label="Placed"
          value={`${placedCount}/${totalPackages}`}
          sub={unplacedCount > 0 ? `${unplacedCount} unplaced` : "All fit!"}
          accent={unplacedCount > 0 ? "#FF6B6B" : "#82E0AA"}
        />
        <StatCard
          label="Free Spaces"
          value={result.freeSpaces.length}
          sub="remaining cavities"
          accent="#F7DC6F"
        />
      </div>

      {/* Utilization bar */}
      <div className="util-bar-wrap">
        <div className="util-bar-track">
          <div
            className="util-bar-fill"
            style={{
              width: `${Math.min(100, util)}%`,
              background: util > 80 ? "#82E0AA" : util > 50 ? "#F7DC6F" : "#FF6B6B",
            }}
          />
        </div>
        <span>{util}% used</span>
      </div>

      {/* Placement table */}
      <div className="placement-table-wrap">
        <table className="placement-table">
          <thead>
            <tr>
              <th></th>
              <th>Package</th>
              <th>Position (x,y,z)</th>
              <th>Rotation</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {result.placements.map((p, i) => {
              const pkgIdx = packages.findIndex((pkg) => pkg.id === p.baseId);
              const color = getPackageColor(pkgIdx >= 0 ? pkgIdx : i);
              return (
                <tr key={p.packageId}>
                  <td>
                    <span className="color-dot" style={{ background: color }} />
                  </td>
                  <td className="pkg-name-cell">{p.label}</td>
                  <td className="mono">
                    ({p.position.x.toFixed(1)}, {p.position.y.toFixed(1)}, {p.position.z.toFixed(1)})
                  </td>
                  <td>
                    <span className="rotation-badge">{p.rotationLabel}</span>
                  </td>
                  <td className="mono">
                    {p.rotation.w}×{p.rotation.h}×{p.rotation.d}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unplaced */}
      {unplacedCount > 0 && (
        <div className="unplaced-warning">
          ⚠️ {unplacedCount} item(s) could not fit in the container.
        </div>
      )}
    </div>
  );
}
