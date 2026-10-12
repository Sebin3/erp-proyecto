import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./integrated.css";
import "./erp/suppliers.css";
import "./erp/supplier-premium.css";
import "./erp/products.css";
import "./erp/dashboard.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
