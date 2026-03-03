---
name: serving-web-content
description: How to serve static files and integrated Vite/React applications in Harper.
---

# Serving Web Content

Instructions for the agent to follow when serving web content from Harper.

## When to Use

Use this skill when you need to serve a frontend (HTML, CSS, JS, or a React app) directly from your Harper instance.

## Steps

1. **Choose a Method**: Decide between the simple Static Plugin or the integrated Vite Plugin.
2. **Option A: Static Plugin (Simple)**:
   - Add to `config.yaml`:
     ```yaml
     static:
       files: 'web/*'
     ```
   - Place files in a `web/` folder in the project root.
   - Files are served at the root URL (e.g., `http://localhost:9926/index.html`).
3. **Option B: Vite Plugin (Advanced/Development)**:
   - Add to `config.yaml`:
     ```yaml
     '@harperfast/vite-plugin':
       package: '@harperfast/vite-plugin'
     ```
   - Ensure `vite.config.ts` and `index.html` are in the project root.
   - Install dependencies: `npm install --save-dev vite @harperfast/vite-plugin`.
   - Use `npm run dev` for development with HMR.
4. **Deploy for Production**: For Vite apps, use a build script to generate static files into a `web/` folder and deploy them using the static handler pattern.
