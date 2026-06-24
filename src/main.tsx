import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";  // 👈 ADD THIS IMPORT
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { validateEnv } from "./utils/env";
import "./index.css";

// Validate environment on startup
try {
  validateEnv();
  console.log("✓ Configuration validated successfully");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("⚠️ Configuration Error:", message);
  // Show error to user
  document.body.innerHTML = `
    <div style="padding: 20px; color: #ef4444; font-family: monospace; background: #000;">
      <h1>⚠️ Configuration Error</h1>
      <pre>${message}</pre>
      <p>Please check your .env file and restart the app</p>
    </div>
  `;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>  {/* 👈 ADD THIS LINE */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </HelmetProvider>  {/* 👈 ADD THIS LINE */}
    </BrowserRouter>
  </React.StrictMode>
);