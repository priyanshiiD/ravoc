# ROVAC™ — Autonomous Robot Cleaner

Interactive 2D HTML5 Canvas web application and guided product explainer for Computer Graphics & Multimedia Systems (CGMS). Features real-time simulations of LiDAR scanning, SLAM mapping, systematic coverage navigation, multi-stage cleaning physics, obstacle avoidance, and auto-docking.

🌐 **Live Demo**: [https://priyanshiiD.github.io/ravoc/](https://priyanshiiD.github.io/ravoc/)

---

## ⚡ Features & Modules

- **Hero Canvas**: Perspective grid, particle trails, and interactive robot graphic.
- **6-Stage Guided Explainer**: Animated tour (Scan, Map, Navigate, Clean, Avoid, Dock) with timeline controls, captions, and stage pills.
- **Anatomy View**: Assembled vs. exploded hardware layer toggling and interactive component inspection.
- **360° LiDAR & SLAM**: Laser ray-casting collision detection and point-cloud room mapping.
- **Coverage Navigation**: Systematic lawnmower path sweep with cleanliness heatmaps.
- **Cleaning System Physics**: Suction intake particle physics, dual side brushes, and wet mopping.
- **Obstacle Avoidance Sandbox**: Interactive drag/drop obstacle placement and dynamic rerouting.
- **Auto-Docking**: Infrared homing beam alignment and contact charging simulation.

---

## 🛠️ Tech Stack & CGMS Concepts

- **Tech Stack**: HTML5, Vanilla CSS3 (Glassmorphism design system), ES6+ JavaScript (Zero dependencies).
- **Graphics**: HTML5 2D Canvas API, 60 FPS `requestAnimationFrame` render loops, 2D matrix transformations (`translate`, `rotate`, `scale`).
- **Shaders & Effects**: Radial/linear gradients, alpha blending, dynamic particle trailing, trigonometric trajectory math.

---

## 📁 File Structure

```
ravoc/
├── index.html        # Main application layout & UI
├── css/
│   └── styles.css    # Core design tokens, glassmorphism UI & responsive styles
├── js/
│   ├── robot.js      # Shared 2D top-down robot rendering module
│   ├── hero.js       # Hero section canvas & particle system
│   ├── explainer.js   # 6-stage guided explainer controller & modal
│   ├── anatomy.js     # Exploded component view & interactive inspection
│   ├── lidar.js       # 360° LiDAR ray-casting & SLAM mapping
│   ├── navigation.js  # Coverage path planning & grid sweep
│   ├── cleaning.js    # Debris particle physics & mopping simulation
│   ├── obstacle.js    # Interactive obstacle sandbox & rerouting
│   ├── dock.js        # Homing alignment & auto-docking simulation
│   ├── features.js    # Feature grid & spec modals
│   └── main.js        # Navigation & scroll handlers
└── README.md         # Documentation
```

---

## 🚀 How to Run Locally

1. Open `index.html` directly in any modern browser, OR
2. Serve locally via terminal:
   ```bash
   npx serve .
   ```
