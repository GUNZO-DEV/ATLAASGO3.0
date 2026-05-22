/**
 * Flashes the browser tab title to alert the driver of new orders.
 * Stops automatically when the tab regains focus.
 */

let intervalId: ReturnType<typeof setInterval> | null = null;
let savedTitle = "";

export function startTabAlert(message: string) {
  if (typeof window === "undefined") return;
  if (intervalId) return; // already flashing

  savedTitle = document.title;
  let show = true;

  intervalId = setInterval(() => {
    document.title = show ? message : savedTitle;
    show = !show;
  }, 900);

  // Stop when the driver switches back to this tab
  window.addEventListener("focus", stopTabAlert, { once: true });
}

export function stopTabAlert() {
  if (typeof window === "undefined") return;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (savedTitle) document.title = savedTitle;
  window.removeEventListener("focus", stopTabAlert);
}
