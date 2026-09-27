// Saved views contain camera coordinates only. Captures, URLs, credentials and
// customer details belong outside this shareable scene metadata.
export function normalizePresentationCamera(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const vector = input => Array.isArray(input) && input.length === 3 && input.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100000) ? input.slice() : null;
  const position = vector(value.position), target = vector(value.target);
  if (!position || !target || Math.hypot(...position.map((v, i) => v - target[i])) < .01) return null;
  const fov = typeof value.fov === 'number' && Number.isFinite(value.fov) ? value.fov : 36;
  return { mode: ['outside', 'inside', 'reception'].includes(value.mode) ? value.mode : 'outside', position, target, fov: Math.max(20, Math.min(90, fov)) };
}

export function normalizePresentationViews(input) {
  const ids = new Set(), output = [];
  for (const value of Array.isArray(input) ? input : []) {
    if (output.length === 6) break;
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(value.id) || ids.has(value.id)) continue;
    const name = typeof value.name === 'string' ? value.name.trim().slice(0, 60) : '';
    if (!name || !['3d', 'photo'].includes(value.viewMode)) continue;
    const camera = value.viewMode === 'photo' ? null : normalizePresentationCamera(value.camera);
    if (value.viewMode === '3d' && !camera) continue;
    ids.add(value.id); output.push({ id: value.id, name, viewMode: value.viewMode, camera });
  }
  return output;
}
