# OTTv2 frontend

This React/Vite app is connected to the Node backend in `../logic`. It uses the
backend REST endpoints for board state, movement, captures, turns, clocks, reset,
and resign actions.

## Launch

Open two terminals from the project root:

```powershell
node logic/main.js
```

```powershell
Set-Location ottv2
npm.cmd install
npm.cmd run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.
On the lobby screen, click **Create room** to receive a room code. Share that code
with the second player, who enters it into **Join room**. The creator is assigned
White and the joining player is assigned Black automatically.

The frontend also supports direct URLs such as
`http://localhost:5173/?room=OTT-ABCDE&color=black`. The Vite proxy forwards `/api`
and `/health` to `http://localhost:3000`.

## Original Vite notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
