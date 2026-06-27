import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/i18n";
import { initLocalDatabase } from "@/lib/idb/db";

void initLocalDatabase();

createRoot(document.getElementById("root")!).render(<App />);
