import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Solana libraries expect a global Buffer in the browser
(window as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;

createRoot(document.getElementById("root")!).render(<App />);
