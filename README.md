# PackOpt3D — 3D Bin Packing Optimizer

## Quick Start

1. Install Node.js (v18+): https://nodejs.org
2. Open a terminal in this folder
3. Run:

   npm install
   npm run dev

4. Open http://localhost:5173 in your browser

## Build for production

   npm run build
   npm run preview

## Project Structure

src/
├── engine/
│   └── binPacking.js       — Optimization algorithm (BFD + guillotine cuts)
├── components/
│   ├── ContainerForm.jsx   — Container dimensions form
│   ├── PackageList.jsx     — Package list editor
│   ├── DrawCanvas.jsx      — Isometric drawing canvas
│   ├── Visualizer3D.jsx    — Three.js 3D viewport
│   └── ResultsPanel.jsx    — Results table & stats
├── utils/
│   └── colors.js           — Color palette utilities
├── App.jsx                 — Root component & state
├── main.jsx                — React entry point
└── styles.css              — Full design system

## How to Use

### Setup Tab
- Enter container dimensions manually
- Add packages with length × width × height + quantity
- Click Run Optimizer

### Draw Tab  
- Select Container or Package mode
- Click & drag to draw the base footprint
- After releasing, drag UP to set height
- Click to confirm the shape
- Each shape auto-syncs to the Setup tab

### Results Tab
- View 3D packed visualization
- Orbit (drag), zoom (scroll), pan (right-drag)
- Hover packages for details
- Toggle free-space overlay
