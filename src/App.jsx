import { useState, useCallback, useMemo } from "react";
import ContainerForm from "./components/ContainerForm";
import PackageList, { newPackage } from "./components/PackageList";
import Visualizer3D from "./components/Visualizer3D";
import ResultsPanel from "./components/ResultsPanel";
import DrawCanvas from "./components/DrawCanvas";
import { packItems } from "./engine/binPacking";
import { getPackageColor } from "./utils/colors";
import "./styles.css";

const DEFAULT_CONTAINER = { length: 120, width: 80, height: 80 };
const DEFAULT_PACKAGES = [
  { ...newPackage(), label: "Box A", length: 40, width: 30, height: 25, quantity: 2 },
  { ...newPackage(), label: "Box B", length: 25, width: 25, height: 20, quantity: 3 },
  { ...newPackage(), label: "Box C", length: 50, width: 20, height: 15, quantity: 1 },
];

export default function App() {
  const [container, setContainer] = useState(DEFAULT_CONTAINER);
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("setup");

  const packageColors = useMemo(() => {
    const map = {};
    packages.forEach((pkg, i) => { map[pkg.id] = getPackageColor(i); });
    return map;
  }, [packages]);

  const runPacking = useCallback(() => {
    if (!container.length || !container.width || !container.height) return;
    setIsRunning(true);
    setTimeout(() => {
      const enriched = packages.map((p, i) => ({ ...p, color: getPackageColor(i) }));
      const res = packItems(container, enriched);
      setResult(res);
      setIsRunning(false);
      setActiveTab("results");
    }, 120);
  }, [container, packages]);

  const handleContainerDrawn = useCallback((dims) => {
    setContainer(dims);
    setResult(null);
  }, []);

  const handlePackageDrawn = useCallback(({ length, width, height, label, quantity }) => {
    setPackages(prev => [...prev, { ...newPackage(), label, length, width, height, quantity }]);
  }, []);

  const hasContainer = container.length > 0 && container.width > 0 && container.height > 0;
  const hasPackages = packages.length > 0;
  const canRun = hasContainer && hasPackages;

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">⬛</span>
          <span className="logo-text">PackOpt<span className="logo-accent">3D</span></span>
        </div>
        <p className="header-sub">3D Bin Packing Optimizer</p>
      </header>

      <main className="app-body">
        <aside className="left-panel">
          <div className="tabs">
            <button className={`tab ${activeTab === "setup" ? "active" : ""}`} onClick={() => setActiveTab("setup")}>
              ✏️ Setup
            </button>
            <button className={`tab ${activeTab === "draw" ? "active" : ""}`} onClick={() => setActiveTab("draw")}>
              🎨 Draw
            </button>
            <button
              className={`tab ${activeTab === "results" ? "active" : ""}`}
              onClick={() => setActiveTab("results")}
              disabled={!result}
            >
              📊 Results {result && <span className="badge">{result.placements.length}</span>}
            </button>
          </div>

          <div className="panel-content">
            {activeTab === "setup" && (
              <>
                <ContainerForm value={container} onChange={(v) => { setContainer(v); setResult(null); }} />
                <PackageList packages={packages} onChange={setPackages} />
                <button className={`run-btn ${isRunning ? "running" : ""}`} onClick={runPacking} disabled={!canRun || isRunning}>
                  {isRunning ? <><span className="spinner" /> Optimizing…</> : <><span>▶</span> Run Optimizer</>}
                </button>
                {!canRun && <p className="run-hint">Fill in container + at least one package to start.</p>}
              </>
            )}

            {activeTab === "draw" && (
              <div className="draw-tab">
                <div className="draw-intro">
                  <span className="draw-intro-icon">✏️</span>
                  <div>
                    <strong>Draw Mode</strong>
                    <p>Click &amp; drag on the canvas to sketch shapes. Each drawn shape updates the setup.</p>
                  </div>
                </div>
                <DrawCanvas
                  onContainerDrawn={handleContainerDrawn}
                  onPackageDrawn={handlePackageDrawn}
                  existingContainer={container}
                />
                <div className="draw-summary">
                  <div className="draw-summary-row">
                    <span>Container</span>
                    <span className={`draw-summary-val ${hasContainer ? "ok" : "missing"}`}>
                      {hasContainer ? `${container.length} × ${container.width} × ${container.height} cm` : "Not set"}
                    </span>
                  </div>
                  <div className="draw-summary-row">
                    <span>Packages</span>
                    <span className="draw-summary-val ok">
                      {packages.reduce((s, p) => s + (p.quantity || 1), 0)} items ({packages.length} types)
                    </span>
                  </div>
                </div>
                <button className={`run-btn ${isRunning ? "running" : ""}`} onClick={runPacking} disabled={!canRun || isRunning}>
                  {isRunning ? <><span className="spinner" /> Optimizing…</> : <><span>▶</span> Run Optimizer</>}
                </button>
              </div>
            )}

            {activeTab === "results" && (
              <ResultsPanel result={result} packages={packages} container={container} />
            )}
          </div>
        </aside>

        <section className="viewport">
          {result ? (
            <Visualizer3D container={container} result={result} packageColors={packageColors} />
          ) : (
            <div className="viewport-empty">
              <div className="empty-visual">
                <div className="empty-box"><div className="empty-box-inner" /></div>
              </div>
              <p>Use <strong>Setup</strong> or <strong>Draw</strong> mode,<br />then click <strong>Run Optimizer</strong>.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
