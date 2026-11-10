import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Solana libraries expect a global Buffer in the browser
(window as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;

const root = createRoot(document.getElementById("root")!);

// The admin panel is its own React tree in a separate chunk, so members never download it.
if (/^\/admin(\/|$)/.test(window.location.pathname)) {
  void import("./admin/AdminApp").then(({ default: AdminApp }) => root.render(<AdminApp />));
} else {
  root.render(<App />);
}
