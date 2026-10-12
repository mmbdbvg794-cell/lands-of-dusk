// Mining and smithing (server/Crafting.java): the lines the server sends
// the browser client, the click-menu actions for veins, forges and anvils,
// and the smithing window. Parsers have no DOM; tested in node.

// "Mining: <ms>|<vein>" as a swing starts -> { ms, vein }; "Mining: done".
export function parseMining(line) {
  const s = String(line ?? '').trim();
  if (s === 'Mining: done') return { done: true };
  const m = /^Mining: (\d+)\|(.+)$/.exec(s);
  return m ? { ms: Number(m[1]), vein: m[2] } : null;
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

// The props (by bare, lower-case name) and the picture of a worked-out
// vein (sprites.gif 62).
export const VEIN = /^(bronze vein|iron vein|coal seam|mithril vein)$/;
export const STATION = /\b(forge|anvil)\b/;
export const WORKED_OUT = 62;
export const isVein = (name) => VEIN.test(String(name ?? '').toLowerCase());
export const isStation = (name) => STATION.test(String(name ?? '').toLowerCase());

export const mineCommand = (id) => `mine ${id}`;
export const SMITH = 'smith';
export const smithCommand = (result, n = 1) => `smith ${result}${n > 1 ? ` ${n}` : ''}`;

// The menu actions for a vein (within a square) or a forge or anvil
// (within two), or null for anything else.
export function craftActions(ent, name, me) {
  const n = String(name ?? '').toLowerCase();
  const dx = Math.abs(ent.x - me.x), dy = Math.abs(ent.y - me.y);
  if (isVein(n)) {
    if (ent.image === WORKED_OUT) return [{ label: 'Mine', disabled: true, hint: 'worked out' }];
    return dx <= 1 && dy <= 1 ? [{ label: 'Mine', cmd: mineCommand(ent.id) }] : [{ label: `Go to the ${n}`, cmd: `goto ${ent.x} ${ent.y}` }];
  }
  if (isStation(n)) {
    const what = /forge/.test(n) ? 'Smelt…' : 'Smith…';
    return dx <= 2 && dy <= 2 ? [{ label: what, cmd: SMITH }] : [{ label: `Go to the ${/forge/.test(n) ? 'forge' : 'anvil'}`, cmd: `goto ${ent.x} ${ent.y}` }];
  }
  return null;
}

// The smithing window: what can be made at the forge or anvil you're by.
// el: the #smith-dialog; send(cmd) runs a command.
export class SmithView {
  constructor(el, send) {
    Object.assign(this, { el, send, pending: [], recipes: [], level: 0 });
    this.list = el.querySelector('.smith-list');
    this.head = el.querySelector('.smith-level');
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
    this.render();
    if (!this.el.open) this.el.show();
    return true;
  }

  render() {
    const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    this.head.textContent = `Your Smithing: ${this.level}`;
    const make = (r, n) => {
      const b = h('button', { type: 'button', textContent: n > 1 ? `Make ${n}` : 'Make', className: n > 1 ? 'ghost' : 'primary' });
      b.addEventListener('click', () => {
        this.send(smithCommand(r.result, n));
        // The counts change: ask again.
        setTimeout(() => this.send(SMITH), 300);
      });
      return b;
    };
    const groups = ['forge', 'anvil'].filter((s) => this.recipes.some((r) => r.station === s));
    this.list.replaceChildren(...groups.flatMap((s) => [
      h('h3', { textContent: s === 'forge' ? 'Forge: smelt ore into bars' : 'Anvil: make bars into gear (needs a smithing hammer)' }),
      ...this.recipes.filter((r) => r.station === s).map((r) => {
        const locked = r.level > this.level;
        return h('div', { className: `smith-row${locked ? ' locked' : ''}${r.can ? '' : ' short'}` },
          h('span', { className: 'smith-name' }, h('b', { textContent: r.result }), h('small', { textContent: r.needs })),
          h('span', { className: 'smith-acts' },
            locked ? h('small', { textContent: `Smithing ${r.level}` })
              : r.can ? h('span', {}, make(r, 1), r.can > 1 ? make(r, Math.min(r.can, 20)) : '')
                : h('small', { textContent: 'not enough' })));
      }),
    ]));
  }
}
