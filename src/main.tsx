import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { resetAllData, initializeDefaultData } from "./lib/storage";

// Reset and reinitialize with demo data (one-time)
const DEMO_DATA_VERSION = 'v2';
if (localStorage.getItem('demo_data_version') !== DEMO_DATA_VERSION) {
  resetAllData();
  localStorage.setItem('demo_data_version', DEMO_DATA_VERSION);
}
initializeDefaultData();

createRoot(document.getElementById("root")!).render(<App />);
