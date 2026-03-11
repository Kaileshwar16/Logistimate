import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ── Orbit controls (inline, no external import needed) ────────────────────────
function addOrbitControls(camera, domElement) {
  let isDragging = false, isPanning = false;
  let prevMouse = { x: 0, y: 0 };
  let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: camera.position.length() };
  let target = new THREE.Vector3(0, 0, 0);

  function updateCamera() {
    camera.position.set(
      target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
      target.y + spherical.radius * Math.cos(spherical.phi),
      target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)
    );
    camera.lookAt(target);
  }

  domElement.addEventListener("mousedown", (e) => {
    if (e.button === 0) isDragging = true;
    if (e.button === 2) isPanning = true;
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mousemove", (e) => {
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    if (isDragging) {
      spherical.theta -= dx * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.01));
      updateCamera();
    }
    if (isPanning) {
      const right = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(target, camera.position).normalize(),
        camera.up
      ).normalize();
      const up = camera.up.clone().normalize();
      target.addScaledVector(right, -dx * 0.05);
      target.addScaledVector(up, dy * 0.05);
      updateCamera();
    }
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mouseup", () => { isDragging = false; isPanning = false; });

  domElement.addEventListener("wheel", (e) => {
    spherical.radius = Math.max(10, spherical.radius + e.deltaY * 0.1);
    updateCamera();
    e.preventDefault();
  }, { passive: false });

  domElement.addEventListener("contextmenu", (e) => e.preventDefault());

  updateCamera();
  return { update: updateCamera, reset: () => {
    spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: camera.position.length() };
    target.set(0, 0, 0);
    updateCamera();
  }};
}

// ── Box mesh factory ──────────────────────────────────────────────────────────
function createBoxMesh(w, h, d, color, opacity = 0.82) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    shininess: 60,
    specular: new THREE.Color(0xffffff),
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Edges
  const edgeGeo = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.4 });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  mesh.add(edges);

  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Visualizer3D({ container, result, packageColors }) {
  const mountRef = useRef(null);
  const sceneRef = useRef({});
  const [viewMode, setViewMode] = useState("perspective");
  const [showFreeSpace, setShowFreeSpace] = useState(false);
  const [hoveredPkg, setHoveredPkg] = useState(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);

    // ── Camera ───────────────────────────────────────────────────────────────
    const maxDim = Math.max(container.length, container.width, container.height);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, maxDim * 20);
    camera.position.set(maxDim * 1.8, maxDim * 1.4, maxDim * 1.8);
    camera.lookAt(0, 0, 0);

    const controls = addOrbitControls(camera, renderer.domElement);

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(maxDim, maxDim * 2, maxDim);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
    fillLight.position.set(-maxDim, 0, -maxDim);
    scene.add(fillLight);

    // ── Grid ─────────────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(maxDim * 3, 30, 0x333344, 0x222233);
    grid.position.y = -container.height / 2;
    scene.add(grid);

    // ── Container wireframe ───────────────────────────────────────────────────
    const cGeo = new THREE.BoxGeometry(container.length, container.height, container.width);
    const cEdges = new THREE.EdgesGeometry(cGeo);
    const cMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, linewidth: 2, transparent: true, opacity: 0.7 });
    const containerWire = new THREE.LineSegments(cEdges, cMat);
    scene.add(containerWire);

    // Container face (subtle fill)
    const cFaceMat = new THREE.MeshPhongMaterial({
      color: 0x001122, transparent: true, opacity: 0.08, side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(cGeo, cFaceMat));

    // ── Package meshes ────────────────────────────────────────────────────────
    const packageMeshes = [];
    if (result) {
      result.placements.forEach((p, i) => {
        const color = packageColors[p.baseId] || "#aaaaaa";
        const { w, h, d } = p.rotation;
        const mesh = createBoxMesh(w, h, d, color);

        // Center offset: container origin is at its center
        mesh.position.set(
          p.position.x + w / 2 - container.length / 2,
          p.position.y + h / 2 - container.height / 2,
          p.position.z + d / 2 - container.width / 2,
        );
        mesh.userData = { placement: p, index: i };
        scene.add(mesh);
        packageMeshes.push(mesh);
      });
    }

    // ── Raycasting for hover ──────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(packageMeshes);
      if (hits.length > 0) {
        setHoveredPkg(hits[0].object.userData.placement);
        el.style.cursor = "pointer";
      } else {
        setHoveredPkg(null);
        el.style.cursor = "grab";
      }
    };
    el.addEventListener("mousemove", onMouseMove);

    // ── Resize ───────────────────────────────────────────────────────────────
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ── Animate ───────────────────────────────────────────────────────────────
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, scene, camera, controls, packageMeshes, grid };

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      el.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [container, result, packageColors]);

  // Update free-space visibility
  useEffect(() => {
    const { scene, packageMeshes } = sceneRef.current;
    if (!scene || !result) return;

    // Remove old free-space meshes
    const toRemove = [];
    scene.children.forEach((c) => { if (c.userData.isFreeSpace) toRemove.push(c); });
    toRemove.forEach((c) => scene.remove(c));

    if (showFreeSpace && result.freeSpaces) {
      result.freeSpaces.forEach((fs) => {
        const m = createBoxMesh(fs.w, fs.h, fs.d, "#ffffff", 0.04);
        m.position.set(
          fs.x + fs.w / 2 - container.length / 2,
          fs.y + fs.h / 2 - container.height / 2,
          fs.z + fs.d / 2 - container.width / 2,
        );
        m.userData.isFreeSpace = true;
        scene.add(m);
      });
    }
  }, [showFreeSpace, result, container]);

  return (
    <div className="visualizer-wrapper">
      <div className="vis-toolbar">
        <button className={`vis-btn ${!showFreeSpace ? "active" : ""}`} onClick={() => setShowFreeSpace(false)}>
          Packages
        </button>
        <button className={`vis-btn ${showFreeSpace ? "active" : ""}`} onClick={() => setShowFreeSpace(true)}>
          + Free Space
        </button>
        <button className="vis-btn" onClick={() => sceneRef.current.controls?.reset()}>
          ↺ Reset View
        </button>
        <span className="vis-hint">Drag to orbit · Scroll to zoom · Right-drag to pan</span>
      </div>

      <div ref={mountRef} className="canvas-mount" />

      {hoveredPkg && (
        <div className="hover-tooltip">
          <strong>{hoveredPkg.label}</strong>
          <div>Position: ({hoveredPkg.position.x.toFixed(1)}, {hoveredPkg.position.y.toFixed(1)}, {hoveredPkg.position.z.toFixed(1)})</div>
          <div>Rotation: {hoveredPkg.rotationLabel}</div>
          <div>Size: {hoveredPkg.rotation.w}×{hoveredPkg.rotation.h}×{hoveredPkg.rotation.d} cm</div>
        </div>
      )}
    </div>
  );
}
