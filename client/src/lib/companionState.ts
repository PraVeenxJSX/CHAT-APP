// Shared state between the hero bubble canvas and the phoenix canvas.
// Both canvases use similar world units (camera z≈6, fov≈42-45) so we can
// treat positions as a rough shared space for repulsion effects.
export const companion = {
  // Phoenix world position (updated each frame by LandingCompanion)
  x: 10,
  y: 10,
  z: 0,
  active: false,
};

// Registered hero bubbles. FloatingOrb pushes an entry on mount and updates
// `pos` every frame so the phoenix can perch on top of a live bubble.
export type OrbEntry = {
  id: number;
  color: string;
  scale: number;
  pos: { x: number; y: number; z: number };
  screen: { x: number; y: number; r: number };
  alive: boolean;
};
export const orbs: OrbEntry[] = [];

export const heroPointer = {
  x: -9999,
  y: -9999,
  active: false,
};

// Which orb the phoenix is currently perched on (id) — null while flying.
export const perch = { targetId: null as number | null };

let _orbId = 0;
export function nextOrbId() {
  _orbId += 1;
  return _orbId;
}