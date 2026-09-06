/* ============================================================
   AKKOUS — Utilities
   ============================================================ */

/** Stagger animation delays for children of a selector */
export function stagger(selector, step) {
  document.querySelectorAll(selector).forEach((parent) => {
    Array.from(parent.children).forEach((child, i) => {
      child.style.transitionDelay = `${i * step}s`;
    });
  });
}
