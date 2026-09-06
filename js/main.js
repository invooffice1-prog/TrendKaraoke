/* ============================================================
   AKKOUS — Main Entry Point
   ============================================================ */
import { initNav } from "./nav.js";
import { initReveal } from "./reveal.js";
import { initParticles } from "./particles.js";
import { initMagnetic } from "./magnetic.js";
import { initSpotlight } from "./spotlight.js";
import { initModal } from "./modal.js";
import { initWhatsApp } from "./whatsapp.js";
import { initI18n } from "./i18n.js";
import { stagger } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  initI18n();

  initNav();
  initReveal();
  initParticles();
  initMagnetic();
  initSpotlight();
  initModal();
  initWhatsApp();

  /* Stagger service card children */
  stagger(".svc-grid", 0.08);
});
