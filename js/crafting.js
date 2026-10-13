// Gathering and making (server/Crafting.java): mining and herbalism,
// smithing and alchemy. The lines the server sends the browser client, the
// click-menu actions for veins, herb patches, forges, anvils and alchemy
// tables, and the making window. Parsers have no DOM; tested in node.

// "Working: <ms>|<what>" as each go starts ("Mining the iron vein") ->
// { ms, what }; "Working: done".
export function parseWorking(line) {
  const s = String(line ?? '').trim();
  if (s === 'Working: done') return { done: true };
  const m = /^Working: (\d+)\|(.+)$/.exec(s);
  return m ? { ms: Number(m[1]), what: m[2] } : null;
}

// "Recipe: station|level|result|needs|can" -> { recipe }; "Recipes:
// forge,anvil|<Smithing>" (the end of the list) -> { stations, level }.
export function parseRecipe(line) {
  const s = String(line ?? '').trim();
  let m = /^Recipe: ([a-z]+)\|(\d+)\|([^|]+)\|([^|]*)\|(\d+)$/.exec(s);
  if (m) return { recipe: { station: m[1], level: Number(m[2]), result: m[3], needs: m[4], can: Number(m[5]) } };
  m = /^Recipes: ([a-z,]*)\|(\d+)$/.exec(s);
  if (m) return { stations: m[1].split(',').filter(Boolean), level: Number(m[2]) };
  return null;
}

// The props (by bare, lower-case name), and the pictures of a worked-out
// vein and a picked-bare patch (sprites.gif 62 and 71).
export const VEIN = /^(bronze vein|iron vein|coal seam|mithril vein)$/;
export const PATCH = /^(mushroom patch|mandrake patch|lavender patch|wolfsbane patch|azeala bush|moonpetal patch)$/;
export const STATION = /\b(forge|anvil|alchemy table|workbench)\b/;
export const WORKED_OUT = 62, PICKED = 71;
export const isVein = (name) => VEIN.test(String(name ?? '').toLowerCase());
export const isPatch = (name) => PATCH.test(String(name ?? '').toLowerCase());
export const isStation = (name) => STATION.test(String(name ?? '').toLowerCase());
// What a used-up source is drawn as by name, in the Painted style.
export function usedUpLook(name, image) {
  if (image === WORKED_OUT && isVein(name)) return 'worked-out vein';
  if (image === PICKED && isPatch(name)) return 'picked patch';
  return null;
}

export const mineCommand = (id) => `mine ${id}`;
export const gatherCommand = (id) => `gather ${id}`;
export const SMITH = 'smith', BREW = 'brew', FLETCH = 'fletch';
// Chopping the tree square at x, y (trees are map squares, not things).
export const chopCommand = (x, y) => `chop ${x} ${y}`;
export const makeCommand = (command, result, n = 1) => `${command} ${result}${n > 1 ? ` ${n}` : ''}`;
export const smithCommand = (result, n = 1) => makeCommand(SMITH, result, n);

// The menu actions for a vein (within a square) or a forge or anvil
// (within two), or null for anything else.
export function craftActions(ent, name, me) {
  const n = String(name ?? '').toLowerCase();
  const dx = Math.abs(ent.x - me.x), dy = Math.abs(ent.y - me.y);
  if (isVein(n)) {
    if (ent.image === WORKED_OUT) return [{ label: 'Mine', disabled: true, hint: 'worked out' }];
    return dx <= 1 && dy <= 1 ? [{ label: 'Mine', cmd: mineCommand(ent.id) }] : [{ label: `Go to the ${n}`, cmd: `goto ${ent.x} ${ent.y}` }];
  }
  if (isPatch(n)) {
    if (ent.image === PICKED) return [{ label: 'Gather', disabled: true, hint: 'picked bare' }];
    return dx <= 1 && dy <= 1 ? [{ label: 'Gather', cmd: gatherCommand(ent.id) }] : [{ label: `Go to the ${n}`, cmd: `goto ${ent.x} ${ent.y}` }];
  }
  if (isStation(n)) {
    const kind = /forge/.test(n) ? 'forge' : /anvil/.test(n) ? 'anvil' : /workbench/.test(n) ? 'workbench' : 'alchemy table';
    const what = { forge: ['Smelt…', SMITH], anvil: ['Smith…', SMITH], 'alchemy table': ['Brew…', BREW], workbench: ['Fletch…', FLETCH] }[kind];
    return dx <= 2 && dy <= 2 ? [{ label: what[0], cmd: what[1] }] : [{ label: `Go to the ${kind}`, cmd: `goto ${ent.x} ${ent.y}` }];
  }
  return null;
}

// The making window: what can be made at the forge, anvil or alchemy
// table you're by. el: the #smith-dialog; send(cmd) runs a command.
export class SmithView {
  constructor(el, send) {
    Object.assign(this, { el, send, pending: [], recipes: [], level: 0 });
    this.list = el.querySelector('.smith-list');
    this.head = el.querySelector('.smith-level');
    this.title = el.querySelector('h2');
    el.querySelector('[data-smith="close"]').addEventListener('click', () => el.close());
  }

  // A parsed line; true if it was ours.
  reply(r) {
    if (!r) return false;
    if (r.recipe) { this.pending.push(r.recipe); return true; }
    this.recipes = this.pending;
    this.pending = [];
    this.level = r.level;
    this.stations = r.stations;
    this.command = r.stations.includes('alchemy') ? BREW : r.stations.includes('fletching') ? FLETCH : SMITH;
    this.render();
    if (!this.el.open) this.el.show();
    return true;
  }

  render() {
    const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    const brewing = this.command === BREW;
    const skill = brewing ? 'Alchemy' : this.command === FLETCH ? 'Fletching' : 'Smithing';
    this.title.textContent = skill;
    this.head.textContent = `Your ${skill}: ${this.level}`;
    const make = (r, n) => {
      const word = brewing ? 'Brew' : 'Make';
      const b = h('button', { type: 'button', textContent: n > 1 ? `${word} ${n}` : word, className: n > 1 ? 'ghost' : 'primary' });
      b.addEventListener('click', () => {
        this.send(makeCommand(this.command, r.result, n));
        // The counts change: ask again.
        setTimeout(() => this.send(this.command), 300);
      });
      return b;
    };
    const HEADS = { forge: 'Forge: smelt ore into bars', anvil: 'Anvil: make bars into gear (needs a smithing hammer)', alchemy: 'Alchemy table: brew herbs into potions', fletching: 'Workbench: make logs into staves and bows (needs a fletching knife)' };
    const groups = ['forge', 'anvil', 'alchemy', 'fletching'].filter((s) => this.recipes.some((r) => r.station === s));
    this.list.replaceChildren(...groups.flatMap((s) => [
      h('h3', { textContent: HEADS[s] }),
      ...this.recipes.filter((r) => r.station === s).map((r) => {
        const locked = r.level > this.level;
        return h('div', { className: `smith-row${locked ? ' locked' : ''}${r.can ? '' : ' short'}` },
          h('span', { className: 'smith-name' }, h('b', { textContent: r.result }), h('small', { textContent: r.needs })),
          h('span', { className: 'smith-acts' },
            locked ? h('small', { textContent: `${skill} ${r.level}` })
              : r.can ? h('span', {}, make(r, 1), r.can > 1 ? make(r, Math.min(r.can, 20)) : '')
                : h('small', { textContent: 'not enough' })));
      }),
    ]));
  }
}
