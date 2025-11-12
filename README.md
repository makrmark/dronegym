# DroneSim — Next.js + Three.js Mini Simulator

This is a small, static-exportable Next.js app that demonstrates a simple drone simulator with two on-screen joysticks.

Features
- Mission select screen (one mission: Circle the Target)
- Two on-screen joysticks: left = yaw, right = sideslip
- Simple Three.js scene for drone, ground and target
- Take Off / Land Now buttons and mission flow
- Configured for static export and deploy to GitHub Pages (`gh-pages`)

Quick start

1. Install dependencies:

```bash
cd /home/markc/Work/dronesim
npm install
```

2. Run locally in dev mode:

```bash
npm run dev
```

3. Build and export static site (output to `out/`):

```bash
npm run build
```

4. Deploy to GitHub Pages (ensure `homepage` or repo is configured):

```bash
npm run deploy
```

Notes
- This is a minimal starter focused on joystick controls and simple flight behavior.
- To change the gh-pages configuration or username/repo, edit `package.json` and add a `homepage` field.
