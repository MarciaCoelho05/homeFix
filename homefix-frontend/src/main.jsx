import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Load Bootstrap JS dynamically to avoid minification issues
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready before loading Bootstrap
  const loadBootstrap = () => {
    try {
      // Dynamically import Bootstrap JS
      import('bootstrap/dist/js/bootstrap.bundle.min.js').catch(err => {
        console.warn('[MAIN] Could not load Bootstrap JS:', err);
      });
    } catch (e) {
      console.warn('[MAIN] Error loading Bootstrap:', e);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBootstrap);
  } else {
    // DOM already ready, load immediately
    setTimeout(loadBootstrap, 0);
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
