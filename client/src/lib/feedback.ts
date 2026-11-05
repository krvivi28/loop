import confetti from 'canvas-confetti';

export const haptic = (ms: number | number[] = 15) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
};

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function celebrate(accent: string) {
  haptic([20, 40, 60]);
  if (reducedMotion()) return;
  const colors = [accent, '#ffffff', '#FFC400'];
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.35 }, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors }), 180);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors }), 300);
}
