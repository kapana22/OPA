/** The same normalized angle drives drawing, touch input and scoring. */
export const DIAL = { width: 320, height: 206, cx: 160, cy: 176, radius: 146 } as const;
export function dialPoint(value: number, radius: number = DIAL.radius) {
  const angle = Math.PI * (1 - Math.max(0, Math.min(1, value)));
  return { x: DIAL.cx + Math.cos(angle) * radius, y: DIAL.cy - Math.sin(angle) * radius };
}
export function dialValue(x: number, y: number, width: number, previous: number): number {
  if (width <= 0 || ![x, y, width].every(Number.isFinite)) return previous;
  const scale = DIAL.width / width;
  const dx = x * scale - DIAL.cx;
  const dy = Math.max(0, DIAL.cy - y * scale);
  // Dragging across the pivot must not make the needle jump between ends.
  if (Math.hypot(dx, dy) < 20) return previous;
  return 1 - Math.atan2(dy, dx) / Math.PI;
}
export function dialSector(left: number, right: number, radius: number = DIAL.radius): string {
  const a = dialPoint(left, radius), b = dialPoint(right, radius);
  return `M ${DIAL.cx} ${DIAL.cy} L ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y} Z`;
}
