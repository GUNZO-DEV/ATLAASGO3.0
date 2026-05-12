/**
 * Synthesises a soft two-tone bell using the Web Audio API.
 * No audio files needed — works offline and avoids asset hosting.
 * Safe to call without a prior user gesture on most modern browsers
 * once the driver has already interacted with the page.
 */
export function playDing() {
  try {
    const ctx = new AudioContext();

    const schedule = (freq: number, gainPeak: number, delay: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      // Instant attack, smooth exponential decay — classic bell envelope
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.2);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 1.2);
    };

    // Primary note (A5 = 880 Hz) + softer harmonic (A6 = 1760 Hz)
    schedule(880,  0.28, 0);
    schedule(1760, 0.10, 0);
    // Subtle second ding a quarter-beat later for richness
    schedule(1109, 0.12, 0.18); // C#6

    // Let GC clean up after sounds finish
    setTimeout(() => ctx.close(), 2000);
  } catch {
    // AudioContext blocked (no user gesture yet) — fail silently
  }
}
