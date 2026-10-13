// The God tab's Crafting window (server/Crafting.java): place veins, herb
// patches, forges, anvils and alchemy tables; see how many there are and
// how many are used up, and fill them all again; and edit the recipes.
// Parsers and the recipes text have no DOM; tested in node.

export const SOURCES = [
  ['bronze vein', 'Mining 0'], ['iron vein', 'Mining 15'], ['coal seam', 'Mining 30'], ['mithril vein', 'Mining 60'],
  ['mushroom patch', 'Herbalism 0'], ['mandrake patch', 'Herbalism 10'], ['lavender patch', 'Herbalism 20'],
  ['wolfsbane patch', 'Herbalism 35'], ['azeala bush', 'Herbalism 50'], ['moonpetal patch', 'Herbalism 65'],
];
export const STATIONS = [['forge', 'smelt ore into bars'], ['anvil', 'bars into gear (needs a smithing hammer)'], ['alchemy table', 'brew potions']];
// The recipe file's stations, as the editor offers them.
export const RECIPE_STATIONS = [['forge', 'Forge'], ['anvil', 'Anvil'], ['alchemy', 'Alchemy table']];

export const STATUS = 'craft status', REFILL = 'craft refill', RECIPES = 'craft recipes';

// "CraftStatus: <source>|<placed>|<used up>" -> { source }; "CraftStatus:
// working|<n>" -> { working }; "CraftStatus: done" -> { done }.
// "CraftRecipes: <base64>" -> { recipes: text }. Else null.
export function parseCraftAdmin(line) {
  const s = String(line ?? '').trim();
  if (s === 'CraftStatus: done') return { done: true };
  let m = /^CraftStatus: working\|(\d+)$/.exec(s);
  if (m) return { working: Number(m[1]) };
  m = /^CraftStatus: ([^|]+)\|(\d+)\|(\d+)$/.exec(s);
  if (m) return { source: { name: m[1], placed: Number(m[2]), usedUp: Number(m[3]) } };
  m = /^CraftRecipes:\s*([A-Za-z0-9+/=]*)$/.exec(s);
  if (m) return { recipes: m[1] ? new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0))) : '' };
  return null;
}

// The recipes file <-> rows { station, level, result, needs } (comments and
// blank lines are kept at the top when saving).
export function recipeRows(text) {
  const rows = [];
  for (const line of String(text ?? '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const p = t.split('|');
    if (p.length !== 4) continue;
    rows.push({ station: p[0].trim().toLowerCase(), level: Number(p[1].trim()) || 0, result: p[2].trim(), needs: p[3].trim() });
  }
  return rows;
}

const HEAD = `# What forges, anvils and alchemy tables make (server/Crafting.java), one per line:
#   station|skill needed|result|ingredients
# An ingredient is "<how many> <item>". Saved from the God tab's Crafting window.
`;
const field = (s) => String(s ?? '').replace(/[|\n\r]/g, ' ').trim();
export function recipesText(rows) {
  return HEAD + rows.filter((r) => field(r.result) && field(r.needs))
    .map((r) => `${field(r.station)}|${Math.max(0, Math.min(100, Math.floor(Number(r.level) || 0)))}|${field(r.result)}|${field(r.needs)}`).join('\n') + '\n';
}
export const saveRecipesCommand = (rows) => `${RECIPES} set ${btoa(String.fromCharCode(...new TextEncoder().encode(recipesText(rows))))}`;

export class CraftAdmin {
  // el: the #craft-admin dialog; send(cmd) runs a command; placeProp(name)
  // places a prop where the god stands (the God tab's own way, so the map
  // counts it as unsaved); items(): item names for suggestions.
  constructor(el, { send, placeProp, items }) {
    Object.assign(this, { el, send, placeProp, items });
    this.body = el.querySelector('.ca-body');
    this.status = [];
    this.working = 0;
    this.rows = null;
    el.querySelector('[data-ca="close"]').addEventListener('click', () => el.close());
  }

  open() {
    this.status = [];
    this.rows = null;
    this.render();
    if (!this.el.open) this.el.show();
    this.send(STATUS);
    this.send(RECIPES);
  }

  reply(r) {
    if (!r) return false;
    if (r.source) { this.pending = [...(this.pending ?? []), r.source]; return true; }
    if (r.working !== undefined) { this.working = r.working; return true; }
    if (r.done) { this.status = this.pending ?? []; this.pending = []; this.render(); return true; }
    if (r.recipes !== undefined) { this.rows = recipeRows(r.recipes); this.render(); return true; }
    return false;
  }

  // The server's answer to saving or refilling, for the window's note.
  note(text) {
    this.message = text;
    this.render();
  }

  render() {
    const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids.filter((k) => k != null)); return e; };
    const button = (label, onClick, cls = '') => { const b = h('button', { type: 'button', textContent: label, className: cls }); b.addEventListener('click', onClick); return b; };
    const again = () => this.render();

    // Placing.
    const placeButton = ([name, what]) => {
      const b = button(name, () => { this.placeProp(name); this.note(`Placed ${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name} where you stand. Use Save map in the God tab to keep it.`); }, 'de-small');
      b.title = `Place ${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name} where you stand (${what})`;
      return b;
    };
    const placing = h('section', { className: 'ca-sec' },
      h('h3', { textContent: 'Place where you stand' }),
      h('p', { className: 'de-hint', textContent: 'Veins and patches go beside open ground; players stand next to them. Remove one by clicking it and choosing Remove (god). Then Save map in the God tab.' }),
      h('div', { className: 'ca-grid' }, ...SOURCES.map(placeButton)),
      h('div', { className: 'ca-grid' }, ...STATIONS.map(placeButton)));

    // Status.
    const used = this.status.reduce((n, s) => n + s.usedUp, 0);
    const status = h('section', { className: 'ca-sec' },
      h('h3', { textContent: 'In the world now' }),
      this.status.length
        ? h('table', { className: 'ca-table' },
          h('tr', {}, h('th', { textContent: 'Kind' }), h('th', { textContent: 'Placed' }), h('th', { textContent: 'Used up' })),
          ...this.status.map((s) => h('tr', {}, h('td', { textContent: s.name }), h('td', { textContent: String(s.placed) }), h('td', { textContent: String(s.usedUp) }))))
        : h('p', { className: 'empty', textContent: 'Asking the server…' }),
      h('div', { className: 'ca-row' },
        h('small', { textContent: `${this.working} player${this.working === 1 ? '' : 's'} mining or gathering now. Used-up ones fill again by themselves after a few minutes.` }),
        button(`Refill all (${used})`, () => { this.send(REFILL); setTimeout(() => this.send(STATUS), 400); }, 'de-small'),
        button('Refresh', () => this.send(STATUS), 'de-small')));

    // Recipes.
    const items = this.items?.() ?? [];
    const list = h('datalist', { id: 'ca-items' }, ...items.map((n) => h('option', { value: n })));
    const input = (value, onInput, { list, ...props } = {}) => {
      const i = h('input', { type: 'text', value: value ?? '', autocomplete: 'off', ...props });
      if (list) i.setAttribute('list', list); // (an attribute only)
      i.addEventListener('input', () => onInput(i.value));
      return i;
    };
    const rows = this.rows ?? [];
    const recipeRow = (r, i) => {
      const station = h('select', {}, ...RECIPE_STATIONS.map(([k, label]) => new Option(label, k, false, r.station === k)));
      station.addEventListener('change', () => { r.station = station.value; });
      return h('div', { className: 'ca-recipe' },
        station,
        input(r.level, (v) => { r.level = v; }, { type: 'number', min: 0, max: 100, className: 'de-num', title: 'Skill needed (Smithing, or Alchemy at the table)' }),
        input(r.result, (v) => { r.result = v; }, { placeholder: 'makes (item)', list: 'ca-items' }),
        input(r.needs, (v) => { r.needs = v; }, { placeholder: 'needs, e.g. 2 iron ore, 1 coal', className: 'ca-needs' }),
        button('✕', () => { rows.splice(i, 1); again(); }, 'ghost de-x'));
    };
    const recipes = h('section', { className: 'ca-sec' },
      h('h3', { textContent: 'Recipes' }),
      h('p', { className: 'de-hint', textContent: 'Station, the skill needed (Smithing at the forge and anvil, Alchemy at the table), what it makes, and what it takes: "2 iron ore, 1 coal". Items must exist. Saving checks every line first.' }),
      this.rows === null ? h('p', { className: 'empty', textContent: 'Asking the server…' }) : null,
      ...rows.map(recipeRow), list,
      this.rows === null ? null : h('div', { className: 'ca-row' },
        button('+ Recipe', () => { rows.push({ station: 'anvil', level: 0, result: '', needs: '' }); again(); }, 'de-small'),
        h('span', { className: 'de-grow' }),
        button('Save recipes', () => this.send(saveRecipesCommand(rows)), 'de-small primary')));

    this.body.replaceChildren(...[
      this.message ? h('p', { className: 'ca-note', textContent: this.message }) : null,
      placing, status, recipes].filter(Boolean));
  }
}
