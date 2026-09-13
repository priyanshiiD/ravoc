# ROVAC™ — Autonomous Robot Cleaner
### Animated Product Explainer System & CGMS Simulation Platform

An interactive 2D HTML5 Canvas web application built for Computer Graphics & Multimedia Systems (CGMS). It features real-time interactive graphics simulations and a **6-stage Animated Product Explainer System** demonstrating autonomous robotics, 360° LiDAR scanning, SLAM mapping, systematic coverage navigation, multi-stage cleaning physics, obstacle avoidance, and auto-docking.

🌐 **Live Demo**: [https://priyanshiiD.github.io/ravoc/](https://priyanshiiD.github.io/ravoc/)

---

## 🎬 Animated Product Explainer System

The core feature of the application is a **6-Stage Interactive Product Explainer Video System** that guides users through the complete operational lifecycle of the ROVAC™ cleaner with synchronized scroll targeting and live canvas animations:

| Stage | Module | Operational Description |
| :---: | :--- | :--- |
| **1** | **Scan** | 360° LiDAR dome activation and environment boundary ray-casting. |
| **2** | **Map** | SLAM point-cloud accumulation and real-time occupancy grid mapping. |
| **3** | **Navigate** | Systematic lawnmower coverage path planning with waypoint tracking. |
| **4** | **Clean** | Multi-stage suction particle physics, dual side brushes & damp mopping. |
| **5** | **Avoid** | Dynamic obstacle detection vectors and real-time reactive detour paths. |
| **6** | **Dock** | Infrared homing beam alignment, magnetic contact latching & auto-charge. |

### Explainer Features:
- **Top Control Bar**: Includes Play/Pause, Skip, Previous/Next stage controls, stage pills, and time tracking.
- **Synchronized Progress Bar**: Linear gradient progress line indicating current stage playback position.
- **Live Ticker Captions**: Real-time contextual explanations displayed during each stage.
- **Completion Modal**: Summary dashboard popping up at the end of the explainer sequence.

---

## ⚡ Interactive Modules

- **Hero Canvas**: Perspective horizon grid, ambient particle halo trails, and animated top-down robot preview.
- **Anatomy Inspection**: Smooth toggling between Assembled and Exploded hardware layers with interactive component ray-casting.
- **360° LiDAR & SLAM**: Interactive laser ray emission, rangefinder collision detection, and point-cloud room mapping.
- **Coverage Navigation**: Lawnmower grid coverage algorithm with real-time floor cleanliness heatmaps.
- **Cleaning System Physics**: Suction intake particle dynamics, counter-rotating side brushes, and wet mopping trails.
- **Obstacle Avoidance Sandbox**: Drag-and-drop / click-to-place obstacle sandbox with real-time vector rerouting.
- **Auto-Docking Simulation**: Infrared beam alignment, magnetic contact docking, and charging power curves.

---

## 🛠️ Tech Stack & CGMS Concepts

- **Tech Stack**: HTML5, Vanilla CSS3 (Custom Glassmorphism Design Tokens), ES6+ JavaScript (Zero external libraries/frameworks).
- **Computer Graphics**: HTML5 2D Canvas API, 60 FPS double-buffered `requestAnimationFrame` loops, matrix transformations (`ctx.translate`, `ctx.rotate`, `ctx.scale`).
- **Shaders & Physics**: Radial & linear gradient shaders, alpha blending (`globalAlpha`), particle trajectory kinematics, and trigonometric ray intersection math.

---

## 📁 Project Structure

```
ravoc/
├── index.html          # Main HTML structure, layout sections & explainer UI
├── css/
│   └── styles.css      # Custom design system, glassmorphism UI & responsive styling
├── js/
│   ├── robot.js        # Core 2D top-down ROVAC™ robot rendering engine
│   ├── hero.js         # Hero section perspective grid & particle halo
│   ├── explainer.js     # 6-stage guided product explainer system & modal controller
│   ├── anatomy.js       # Exploded component view & interactive inspection
│   ├── lidar.js         # 360° LiDAR ray-casting & SLAM point-cloud generator
│   ├── navigation.js    # Systematic grid coverage path planning simulation
│   ├── cleaning.js      # Debris suction particle physics & mopping simulation
│   ├── obstacle.js      # Interactive obstacle sandbox & reactive rerouting
│   ├── dock.js          # Infrared homing alignment & auto-docking simulation
│   ├── features.js      # Technical specification grid & feature modals
│   └── main.js          # Entry point, navigation & smooth scrolling handlers
└── README.md           # Project documentation
```

---

## 🚀 How to Run Locally

1. Open `index.html` directly in any web browser, OR
2. Serve locally via terminal:
   ```bash
   npx serve .
   ```
