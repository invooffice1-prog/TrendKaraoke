/* ============================================================
   AKKOUS — Service Card Spotlight
   ============================================================ */
export function initSpotlight() {
  document.querySelectorAll(".svc").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty(
        "--mx",
        ((e.clientX - r.left) / r.width) * 100 + "%"
      );
      card.style.setProperty(
        "--my",
        ((e.clientY - r.top) / r.height) * 100 + "%"
      );
    });
  });
}
