import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlayProvider } from "@playhtml/react";
import App from "./App.jsx";
import "./styles/app.css";

const params = new URLSearchParams(window.location.search);
const room = params.get("room")?.toUpperCase() || "ottv2-lobby";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PlayProvider
      initOptions={{
        room,
        cursors: {
          enabled: true,
          room: "page",
        },
      }}
    >
      <App />
    </PlayProvider>
  </StrictMode>,
);
