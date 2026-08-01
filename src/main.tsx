import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/i18n";
import { initLocalDatabase } from "@/lib/idb/db";

void initLocalDatabase().catch(() => {
  // The app remains usable with in-memory credentials if browser storage is unavailable.
});

createRoot(document.getElementById("root")!).render(<App />);
