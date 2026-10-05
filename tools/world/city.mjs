// Builds a town into the world from a plan (tools/world/cities/*.mjs):
//
//   node tools/world/city.mjs <city plan> <shortmap> <out dir>
//
// The plan draws the town as characters on a grid (see LEGEND) and lists
// who and what is in it: NPCs with their conversations (made with the
// same compiler as the God tab's dialogue editor, so they can be edited
// there later), shops, signs, monsters and quest journal lines.
//
// Nothing on the server is touched. The out dir gets
//   bundle.json   everything to install: the tiles that change, the
//                 entries for the props, merchants, signs and mobs files,
//                 and the new files (defProps, talk scripts...)
//   plan.txt      the grid as characters, for checking by eye
//   crop.js       the town's tiles (window.CROP), for a picture of it
// and tools/world/install_city.py puts a bundle into a game directory.
//
// Squares the plan leaves blank keep whatever the map has there, so a town
// sits in the land around it.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { toScript, toGreet, flagsOf, journalEntriesOf, tidyDialogue, toTileScript, canMoveExpr, blockedText, tileFlagsOf } from '../../js/dialogue.js';

// Plan characters -> tiles. Paths and water are fitted to their
// neighbours below; trees vary.
export const LEGEND = {
  ',': 36,   // grass
  ';': 1,    // meadow
  '_': 38,   // sand
  'o': 127,  // ornate stone (plazas)
  'm': 105,  // mosaic
  'M': 42,   // marble
  't': 43,   // teal marble
  'c': 96,   // crystal (walkable)
  'C': 128,  // crystal, another cut
  '=': 149,  // framed plank floor
  'P': 63,   // plank floor
  'l': 41,   // pale floor tiles
  'k': 20,   // dark stone floor
  'x': 46,   // black and white checks
  'e': 40,   // packed earth
  '#': 62,   // wooden wall
  'W': 101,  // wooden wall, darker
  'S': 59,   // stone wall
  's': 58,   // stone wall, darker
  'R': 49,   // rough rock (cave walls)
  'B': 60,   // brick wall
  'D': 23,   // door in a north or south wall
  '<': 158,  // door in a side wall
  '>': 159,
  'L': 108,  // lava (not walkable)
  'u': 106,  // stairs
  'U': 107,
  'i': 24,   // torch on a stone wall
};
const TREES = [64, 64, 103];
const GOLDEN = [25, 26]; // autumn trees
const WATER = 65;
// Water with land on these sides (grass shores; tools/world/tiles.json).
const SHORE = { W: 66, E: 67, N: 68, S: 69, WS: 70, NW: 71, ES: 72, NE: 73, cSE: 74, cNE: 75, cNW: 76, cSW: 77 };
// Path pieces on grass: along, across, corners, and a crossing.
const PATH = { NS: 28, EW: 29, NE: 30, NW: 31, SE: 32, SW: 33, X: 34 };
const JOINS_PATH = new Set(['.', 'D', '<', '>', 'o', 'm', 'M', 'e', 'u', 'U']);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296);
}

class Plan {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.grid = Array.from({ length: h }, () => Array(w).fill(' '));
    this.props = []; this.merchants = []; this.signs = []; this.mobs = [];
    this.npcs = []; this.files = {}; this.notes = []; this.walks = [];
    this.far = []; // single squares anywhere on the map (map coordinates)
    this.sets = []; // values to change in the game's own files
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  at(x, y) { return this.in(x, y) ? this.grid[y][x] : ' '; }
  set(x, y, ch) { if (this.in(x, y)) this.grid[y][x] = ch; }
  // A square as a tile number rather than a legend character.
  tileNumber(x, y, t) { this.set(x, y, t); }
  fill(x, y, w, h, ch) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch); }
  // A filled ellipse inside the box.
  oval(x, y, w, h, ch) {
    const cx = x + (w - 1) / 2, cy = y + (h - 1) / 2;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (((i - cx) / (w / 2)) ** 2 + ((j - cy) / (h / 2)) ** 2 <= 1) this.set(i, j, ch);
    }
  }
  // A ring of trees: an oval band `thick` squares wide.
  ring(x, y, w, h, thick, ch = 'T') {
    const cx = x + (w - 1) / 2, cy = y + (h - 1) / 2;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const d = Math.hypot((i - cx) / (w / 2), (j - cy) / (h / 2));
      const inner = Math.hypot((i - cx) / (w / 2 - thick), (j - cy) / (h / 2 - thick));
      if (d <= 1 && inner > 1) this.set(i, j, ch);
    }
  }
  // Straight paths between points, across then down.
  path(points, ch = '.') {
    for (let k = 1; k < points.length; k++) {
      let [x, y] = points[k - 1];
      const [x1, y1] = points[k];
      while (x !== x1) { this.set(x, y, ch); x += Math.sign(x1 - x); }
      while (y !== y1) { this.set(x, y, ch); y += Math.sign(y1 - y); }
      this.set(x, y, ch);
    }
  }
  // A building: walls round a floor, and doors ([side, offset], side n/s/e/w).
  building(x, y, w, h, { wall = '#', floor = '=', doors = [] } = {}) {
    this.fill(x, y, w, h, wall);
    this.fill(x + 1, y + 1, w - 2, h - 2, floor);
    for (const [side, off] of doors) {
      if (side === 'n') this.set(x + off, y, 'D');
      if (side === 's') this.set(x + off, y + h - 1, 'D');
      if (side === 'w') this.set(x, y + off, '<');
      if (side === 'e') this.set(x + w - 1, y + off, '>');
    }
    return { x, y, w, h };
  }
  prop(name, x, y) { this.props.push({ name, x, y }); }
  merchant(x, y, wares) { this.merchants.push({ x, y, wares }); }
  sign(name, text, x, y) { this.signs.push({ name, text, x, y }); }
  mob(name, level, x, y) { this.mobs.push({ name, level, x, y }); }
  file(path, text) { this.files[path] = text; }
  // Who may step onto a square, as the tile editor's walking rule (see
  // canMoveExpr in js/dialogue.js): { kind, flag, speaker, verb, says }.
  walk(x, y, rule) { this.square(x, y).walk = rule; }
  // What happens when someone steps on a square: the tile editor's rules
  // (see toTileScript in js/dialogue.js), e.g. a teleport.
  action(x, y, rules) { this.square(x, y).rules = rules; }
  square(x, y, abs = false) {
    let sq = this.walks.find((w) => w.x === x && w.y === y && w.abs === abs);
    if (!sq) this.walks.push(sq = { x, y, abs, rules: [], walk: null });
    return sq;
  }
  // Away from the plan's grid, in map coordinates: one square's tile (a
  // legend character), and its walking rule and action (a cave mouth on a
  // far mountain, say).
  farTile(x, y, ch) { this.far.push({ x, y, ch }); }
  // A value in one of the game's key/value files (a key line, then its
  // value): e.g. where a race starts, in defRaces/<race>.
  setValue(file, key, value) { this.sets.push({ file, key, value: String(value) }); }
  farWalk(x, y, rule) { this.square(x, y, true).walk = rule; }
  farAction(x, y, rules) { this.square(x, y, true).rules = rules; }
  // Someone to talk to: a prop called `name` that looks like the prop
  // `look`, with a description and a conversation (the dialogue editor's
  // shape, see js/dialogue.js).
  npc({ name, look, desc, x, y, dlg }) {
    this.npcs.push({ name, look, desc, dlg });
    this.prop(name, x, y);
  }
}

// Fits path pieces and pond shores to their neighbours, and turns the
// grid into tile numbers (null where the map is kept).
function tiles(plan, seed) {
  const r = rng(seed);
  const out = Array.from({ length: plan.h }, () => Array(plan.w).fill(null));
  for (let y = 0; y < plan.h; y++) for (let x = 0; x < plan.w; x++) {
    const ch = plan.at(x, y);
    if (ch === ' ') continue;
    if (typeof ch === 'number') { out[y][x] = ch; continue; }
    if (ch === 'T') { out[y][x] = TREES[Math.floor(r() * TREES.length)]; continue; }
    if (ch === 'Y') { out[y][x] = GOLDEN[Math.floor(r() * GOLDEN.length)]; continue; }
    if (ch === '.') {
      const j = (dx, dy) => JOINS_PATH.has(plan.at(x + dx, y + dy));
      const n = j(0, -1), s = j(0, 1), e = j(1, 0), w = j(-1, 0);
      const count = n + s + e + w;
      let t;
      if (count >= 3) t = PATH.X;
      else if (n && e) t = PATH.NE;
      else if (n && w) t = PATH.NW;
      else if (s && e) t = PATH.SE;
      else if (s && w) t = PATH.SW;
      else if (e || w) t = PATH.EW;
      else t = PATH.NS;
      out[y][x] = t;
      continue;
    }
    if (ch === '~') {
      const land = (dx, dy) => plan.at(x + dx, y + dy) !== '~';
      const N = land(0, -1), S = land(0, 1), E = land(1, 0), W = land(-1, 0);
      let t = WATER;
      if (N && W) t = SHORE.NW;
      else if (N && E) t = SHORE.NE;
      else if (S && W) t = SHORE.WS;
      else if (S && E) t = SHORE.ES;
      else if (N) t = SHORE.N;
      else if (S) t = SHORE.S;
      else if (W) t = SHORE.W;
      else if (E) t = SHORE.E;
      else if (land(-1, -1)) t = SHORE.cNW;
      else if (land(1, -1)) t = SHORE.cNE;
      else if (land(1, 1)) t = SHORE.cSE;
      else if (land(-1, 1)) t = SHORE.cSW;
      if ((N && S) || (E && W)) plan.notes.push(`water at ${x},${y} is too narrow for a shore piece`);
      out[y][x] = t;
      continue;
    }
    if (!(ch in LEGEND)) throw new Error(`plan character "${ch}" at ${x},${y} isn't in the legend`);
    out[y][x] = LEGEND[ch];
  }
  return out;
}

// A named prop's file: the prop it looks like, with its own description
// and "look" (as server/Props.java's nameprop writes them).
function namedPropFile(baseText, look, desc) {
  const lines = baseText.replace(/\r/g, '').split('\n');
  const keep = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === '.' || l === '') continue;
    if (l === 'description' || l === 'look') { i++; continue; }
    keep.push(lines[i]);
  }
  return ['description', desc, ...keep, 'look', look, '.', ''].join('\n');
}

export async function build(planPath, mapPath, outDir, { baseProps = {} } = {}) {
  const city = (await import(pathToFileURL(resolve(planPath)).href)).default;
  const [w, h] = city.size;
  const plan = new Plan(w, h);
  city.build(plan);
  const grid = tiles(plan, city.seed ?? 1);
  const [x0, y0] = city.origin;

  // The squares must be on the map and not undo anything: the plan says
  // where it may build, and every square it changes is listed.
  const map = readFileSync(mapPath);
  const C = map.readInt32BE(0), R = map.readInt32BE(4);
  if (x0 + w > C || y0 + h > R) throw new Error('the town runs off the map');
  const changes = [];
  for (const { x, y, ch } of plan.far) {
    const tile = typeof ch === 'number' ? ch : LEGEND[ch];
    if (tile == null) throw new Error(`far square ${x},${y}: "${ch}" isn't in the legend`);
    const was = map.readUInt16BE(8 + (x * R + y) * 2);
    if (was !== tile) changes.push([x, y, tile, was, true]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = grid[y][x];
    if (t == null) continue;
    const was = map.readUInt16BE(8 + ((x0 + x) * R + y0 + y) * 2);
    if (was !== t) changes.push([x0 + x, y0 + y, t, was]);
  }
  // Never inside the old 1000 x 1000 world, unless the plan says it may
  // (oldWorld: a harbour and its trail), and then only over what its
  // mayBuild allows.
  if (!city.oldWorld) for (const [x, y] of changes) if (x < 1000 && y < 1000) throw new Error(`the plan changes ${x},${y}, in the old world`);
  if (city.oldWorld && !city.mayBuild) throw new Error('a plan that changes the old world must say what it may build over (mayBuild)');
  if (city.mayBuild) for (const [x, y, , was, far] of changes) {
    if (far) continue; // far squares are placed one by one, on purpose
    if (!city.mayBuild(was)) throw new Error(`the plan builds over tile ${was} at ${x},${y}, which it says it mustn't`);
  }

  const abs = (o) => ({ ...o, x: x0 + o.x, y: y0 + o.y });
  const files = { ...plan.files };
  const journal = [];
  const conditions = new Set();
  for (const npc of plan.npcs) {
    // No look: a prop of its own (its file made by the plan, or already
    // in the game), just given a conversation.
    if (npc.look) {
      const base = baseProps[npc.look] ?? files[`defProps/${npc.look}`];
      if (base == null) throw new Error(`${npc.name} looks like "${npc.look}", which isn't a prop`);
      files[`defProps/${npc.name}`] = namedPropFile(base, npc.look, npc.desc);
    }
    if (npc.dlg) {
      tidyDialogue(npc.dlg);
      files[`talk/${npc.name}`] = toScript(npc.name, npc.dlg);
      files[`talk/${npc.name}.dlg`] = JSON.stringify(npc.dlg);
      const greet = toGreet(npc.dlg);
      if (greet) files[`talk/${npc.name}.greet`] = greet + '\n';
      for (const f of flagsOf(npc.dlg)) conditions.add(f);
      for (const j of journalEntriesOf(npc.dlg)) journal.push(j);
    }
  }
  // Walking rules, written as the tile editor writes them (server/Props.java
  // tileSet), so they open there: the rules file, an empty walk-on script,
  // the can-move script and what a player who can't is told.
  for (const { x, y, abs, rules, walk } of plan.walks) {
    const key = abs ? `${x}_${y}` : `${x0 + x}_${y0 + y}`;
    const w = walk ?? { kind: 'everyone', flag: '', speaker: '', says: '' };
    files[`tileactions/${key}.json`] = JSON.stringify({ rules, walk: w });
    files[`defMoveActions/${key}`] = toTileScript(rules);
    if (canMoveExpr(w)) files[`defCanMoveScripts/${key}`] = `#Who can step here, made in the God tab.\n${canMoveExpr(w)}\n`;
    const told = blockedText(w);
    if (told) files[`tileactions/${key}.block`] = told;
    // The flags its rules use, and journal lines on their "set flag"s.
    for (const f of tileFlagsOf(rules, w)) conditions.add(f);
    for (const j of journalEntriesOf({ stages: rules.map((r) => ({ answers: [{ label: 'x', effects: r.effects }] })) })) journal.push(j);
  }
  const bundle = {
    name: city.name,
    oldWorld: !!city.oldWorld,
    area: { x: x0, y: y0, w, h },
    tiles: changes.map(([x, y, t]) => [x, y, t]),
    props: plan.props.map(abs),
    merchants: plan.merchants.map(abs),
    signs: plan.signs.map(abs),
    mobs: plan.mobs.map(abs),
    files,
    copies: city.copies ?? [],
    sets: plan.sets,
    // The journal shows a quest's last line, so a finished step goes last.
    // One line per flag (the first written).
    journal: [...journal.filter((j) => !j.done), ...journal.filter((j) => j.done)].filter((j, i, all) => all.findIndex((k) => k.flag.toLowerCase() === j.flag.toLowerCase()) === i),
    conditions: [...conditions],
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/bundle.json`, JSON.stringify(bundle, null, 1));
  // The plan with everyone on it, for checking by eye.
  const marks = plan.grid.map((row) => row.slice());
  for (const p of plan.props) marks[p.y][p.x] = '@';
  for (const m of plan.merchants) marks[m.y][m.x] = '$';
  for (const s of plan.signs) marks[s.y][s.x] = '!';
  for (const m of plan.mobs) marks[m.y][m.x] = '&';
  writeFileSync(`${outDir}/plan.txt`, marks.map((r) => r.join('')).join('\n') + '\n');
  // The town's tiles over the map's, for a picture.
  const crop = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) row.push(grid[y][x] ?? map.readUInt16BE(8 + ((x0 + x) * R + y0 + y) * 2));
    crop.push(row);
  }
  writeFileSync(`${outDir}/crop.js`, 'window.CROP=' + JSON.stringify(crop) + ';window.MARKS=' + JSON.stringify([...plan.props.map((p) => [p.x, p.y, 'p']), ...plan.merchants.map((p) => [p.x, p.y, 'm']), ...plan.signs.map((p) => [p.x, p.y, 's']), ...plan.mobs.map((p) => [p.x, p.y, 'x'])]));
  return { bundle, notes: plan.notes, changes: changes.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , planPath, mapPath, outDir, propsJson] = process.argv;
  if (!outDir) {
    console.error('usage: node tools/world/city.mjs <city plan> <shortmap> <out dir> [base props json]');
    process.exit(2);
  }
  const baseProps = propsJson ? JSON.parse(readFileSync(propsJson, 'utf8')) : {};
  const { bundle, notes, changes } = await build(planPath, mapPath, outDir, { baseProps });
  console.log(`${bundle.name}: ${changes} squares change; ${bundle.props.length} props, ${bundle.merchants.length} shops, ${bundle.signs.length} signs, ${bundle.mobs.length} monsters, ${Object.keys(bundle.files).length} files, ${bundle.journal.length} journal lines`);
  for (const n of notes) console.log('note:', n);
}
