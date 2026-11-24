import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { BuilderApp } from "@/components/builder/app";
import "@/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <BuilderApp />
      <Toaster theme="dark" position="bottom-center" />
    </StrictMode>,
  );
}
