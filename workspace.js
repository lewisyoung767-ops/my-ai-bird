import fs from 'node:fs/promises';
import path from 'node:path';
const extensions = new Set(['.svg', '.html', '.txt', '.json', '.stl', '.scad']);
export async function safePath(root, name) {
  // Flat names deliberately disallow directories, traversal, Windows ADS and device names.
  if (typeof name !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,70}\.(svg|html|txt|json|stl|scad)$/.test(name) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])\./i.test(name)) throw new Error('Invalid creation filename');
  if (!extensions.has(path.extname(name))) throw new Error('Unsupported file type');
  const realRoot = await fs.realpath(root);
  const target = path.resolve(realRoot, name);
  if (path.dirname(target) !== realRoot) throw new Error('Path outside workspace');
  try { const stat = await fs.lstat(target); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Only regular files are allowed'); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  return target;
}
export async function writeCreation(root, name, content) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > 150000) throw new Error('Creation exceeds 150 KB');
  const target = await safePath(root, name);
  // O_NOFOLLOW where supported; exclusive temp file and rename never follow target symlinks.
  const temp = path.join(await fs.realpath(root), `.write-${crypto.randomUUID()}`);
  try { await fs.writeFile(temp, content, { flag: 'wx' }); await fs.rename(temp, target); } finally { await fs.rm(temp, { force: true }); }
}
export async function readCreation(root, name) {
  const target = await safePath(root, name);
  const handle = await fs.open(target, 'r');
  try { const stat = await handle.stat(); if (stat.size > 150000) throw new Error('File too large'); return await handle.readFile('utf8'); } finally { await handle.close(); }
}
export async function listCreations(root) {
  const result = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
    try { const target = await safePath(root, entry.name); const s = await fs.stat(target); result.push({ name: entry.name, size: s.size, updatedAt: s.mtime.toISOString() }); } catch {}
  }
  return result.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
