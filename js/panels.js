// The side column: the character card (name, location, HP/MP/stamina
// bars), and the Inventory, Equipment and Stats tabs plus the Action
// menu, standing in for the Java client's pnlStats and EquipmentFrame.
// Every command goes out through `send`, just as if it had been typed.

import { slotForType, command } from './player.js';
import { parseStats, playerConditions } from './stats.js';
import { buyCommand, sellCommand } from './shop.js';
import { putCommand, takeCommand, groupContents, BOX_BUY, boxPut, boxTake } from './storage.js';

const SLOT_LABELS = {
  wield: 'Wield', arms: 'Arms', legs: 'Legs', torso: 'Torso', waist: 'Waist',
  neck: 'Neck', skull: 'Skull', eyes: 'Eyes', hands: 'Hands',
};
// The equipment grid, roughly head to toe.
const SLOT_GRID = ['skull', 'eyes', 'neck', 'arms', 'torso', 'hands', 'wield', 'waist', 'legs'];
// Drop is the one command that can lose an item (anything worthless
// vanishes), so it takes a second press within this long.
const DROP_CONFIRM_MS = 3000;

export class Panels {
  constructor(root, player, send) {
    this.player = player;
    this.send = send;
    this.$ = (sel) => root.querySelector(sel);
    this.tabs = [...root.querySelectorAll('[role="tab"]')];
    this.armedDrop = null; // { id, timer } while a Drop button awaits its second press

    for (const tab of this.tabs) tab.addEventListener('click', () => this.select(tab));
    root.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (!step) return;
      e.preventDefault();
      e.stopPropagation(); // not a walk
      const tabs = this.tabs.filter((t) => !t.hidden);
      const i = tabs.indexOf(document.activeElement);
      const next = tabs[(i + step + tabs.length) % tabs.length];
      next.focus();
      this.select(next, true);
    });
    this.$('#actions').addEventListener('change', (e) => {
      const action = e.target.value;
      e.target.value = '';
      if (action) this.send(action);
    });
    // Buying by name, for a merchant whose price list hasn't come.
    this.$('#shop-manual').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const item = f.item.value.trim();
      if (item) this.send(buyCommand(item, f.qty.value));
    });
    this.onMerchant = null; // the merchant entity on your square, if any
    // Storage you're next to ({ entity, listing }), if any: listing is the
    // last { name, items } the server sent, null until it comes.
    this.storage = null;
    this.$('#store-close').addEventListener('click', () => this.setStorage(null));
    this.$('#tab-store').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-store]');
      if (!btn) return;
      const st = this.storage;
      if (!st) return;
      if (btn.dataset.store === 'buy') return this.send(BOX_BUY);
      // A deposit box has its own commands; storage names the one clicked.
      if (st.box) this.send(btn.dataset.store === 'take' ? boxTake(btn.dataset.name) : boxPut(btn.dataset.id));
      else this.send(btn.dataset.store === 'take' ? takeCommand(btn.dataset.name, st.entity.id) : putCommand(btn.dataset.id, st.entity.id));
    });
    // Shop rows: Buy/Sell with the quantity from the row's own box.
    for (const list of [this.$('#shop-buy'), this.$('#shop-sell')]) {
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-trade]');
        if (!btn) return;
        const qty = btn.closest('li').querySelector('input.qty')?.value ?? 1;
        const name = btn.dataset.name;
        this.send(btn.dataset.trade === 'buy' ? buyCommand(name, qty) : sellCommand(name, qty));
      });
    }
    // One listener per list, reading what to do from the button's data.
    for (const list of [this.$('#inv-list'), this.$('#equip-list')]) {
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-cmd]');
        if (btn) this.run(btn);
      });
    }
  }

  // Clicking the open tab again folds the panel away, leaving the tab
  // row, which gives the text output more room on a phone.
  select(tab, open = tab.getAttribute('aria-selected') !== 'true' || this.collapsed) {
    for (const t of this.tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      this.$(`#${t.getAttribute('aria-controls')}`).hidden = !on || !open;
    }
    this.collapsed = !open;
    this.$('#panel').classList.toggle('collapsed', this.collapsed);
    // The tab row scrolls sideways on a phone; keep the chosen tab in view.
    tab.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    this.onToggle?.(tab.dataset.tab, open);
  }

  // Shows or hides a tab (the God tab, for gods only); hiding the open one
  // goes back to the inventory.
  setTabVisible(name, show) {
    const tab = this.tabs.find((t) => t.dataset.tab === name);
    if (!tab || tab.hidden === !show) return;
    tab.hidden = !show;
    if (!show && tab.getAttribute('aria-selected') === 'true') this.selectByName('inv', !this.collapsed);
  }

  selectByName(name, open) {
    const tab = this.tabs.find((t) => t.dataset.tab === name) ?? this.tabs[0];
    this.select(tab, open);
  }

  run(btn) {
    const { cmd, id, name } = btn.dataset;
    if (cmd === 'drop') {
      if (this.armedDrop?.id !== id) {
        this.disarmDrop();
        btn.textContent = 'Sure?';
        btn.classList.add('armed');
        this.armedDrop = { id, timer: setTimeout(() => this.disarmDrop(), DROP_CONFIRM_MS) };
        return;
      }
      this.disarmDrop();
    }
    this.send(command[cmd](id));
  }

  disarmDrop() {
    if (!this.armedDrop) return;
    clearTimeout(this.armedDrop.timer);
    const btn = this.$(`#inv-list button.armed`);
    if (btn) {
      btn.textContent = 'Drop';
      btn.classList.remove('armed');
    }
    this.armedDrop = null;
  }

  // Redraws whichever part Player.apply() says changed.
  update(part) {
    switch (part) {
      case 'status': return this.renderStatus();
      case 'items': return this.renderItems();
      case 'equipment': return this.renderEquipment();
      case 'stats': return this.renderStats();
      case 'actions': return this.renderActions();
      case 'shop': return this.renderShop();
      case 'store': return this.renderStorage();
    }
  }

  renderAll() {
    for (const part of ['status', 'items', 'equipment', 'stats', 'actions', 'shop', 'store']) this.update(part);
  }

  renderStatus() {
    const p = this.player;
    this.$('#char-name').textContent = p.name ?? '—';
    setBar(this.$('#bar-hp'), p.hp, p.maxhp);
    setBar(this.$('#bar-mp'), p.mp, p.maxmp);
    this.$('#stat-loc').textContent = `${p.x}, ${p.y}`;
  }

  renderItems() {
    if (this.storage) this.renderStorage();
    const groups = this.player.groupedItems();
    const list = this.$('#inv-list');
    list.replaceChildren(
      ...groups.map((g) => {
        const slot = slotForType(g.slot);
        const id = g.ids[0];
        return row(
          [text('span', 'name', g.name), g.ids.length > 1 && text('span', 'count', `×${g.ids.length}`),
            slot && text('span', 'pill', SLOT_LABELS[slot])],
          [slot ? button('Wear', 'wear', id) : button('Use', 'use', id, g.name), button('Drop', 'drop', id, g.name)],
        );
      }),
    );
    // The server resends the inventory often; keep a Drop that's waiting
    // for its second press armed if that item is still there.
    if (this.armedDrop) {
      const btn = list.querySelector(`button[data-cmd="drop"][data-id="${this.armedDrop.id}"]`);
      if (btn) {
        btn.textContent = 'Sure?';
        btn.classList.add('armed');
      } else this.disarmDrop();
    }
    this.$('#inv-empty').hidden = groups.length > 0;
    this.$('#tab-inv-count').textContent = this.player.items.length ? String(this.player.items.length) : '';
  }

  // The worn gear on the body outline (see index.html). Each slot sits
  // where it's worn; the Painted style's item art shows when there is some.
  renderEquipment() {
    const eq = this.player.equipment;
    const art = this.itemArt?.();
    this.$('#equip-list').replaceChildren(
      ...SLOT_GRID.map((slot) => {
        const item = eq[slot];
        const cell = document.createElement('div');
        cell.className = `doll-slot${item ? '' : ' empty-slot'}`;
        cell.dataset.slot = slot;
        cell.role = 'listitem';
        cell.title = item ? `${SLOT_LABELS[slot]}: ${item.name}` : `${SLOT_LABELS[slot]}: nothing`;
        const frame = art?.index.get(item?.name.toLowerCase());
        if (frame !== undefined) {
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          c.className = 'slot-icon';
          art.sheet.draw(c.getContext('2d'), frame, 0, 0, 64);
          cell.append(c);
        }
        cell.append(text('span', 'slot-label', SLOT_LABELS[slot]), text('span', 'slot-item', item ? item.name : ''));
        if (item) {
          const b = button('×', 'unwear', item.id);
          b.className = 'remove';
          b.title = b.ariaLabel = `Remove ${item.name}`;
          cell.append(b);
        }
        return cell;
      }),
    );
  }

  // Gold and experience go at the top of the inventory, stamina joins the
  // bars, and the rest is laid out in sections.
  renderStats() {
    const s = parseStats(this.player.stats);
    const has = this.player.stats.length > 0;
    this.$('#stats-empty').hidden = has;

    this.gold = s.gold;
    this.exp = s.exp;
    this.renderShopSummary();
    this.$('#inv-summary').hidden = s.gold === null && s.exp === null;
    this.$('#inv-gold').textContent = s.gold === null ? '' : `${s.gold} gp`;
    this.$('#inv-exp').textContent = s.exp === null ? '' : `${s.exp} exp`;

    const stamina = s.bars.find((b) => /^stamina$/i.test(b.label));
    this.$('#bar-sp').hidden = !stamina;
    if (stamina) setBar(this.$('#bar-sp'), stamina.value, stamina.max);

    this.renderCharStats(s);

    // The Skills tab: just the skills (attributes, combat numbers and
    // conditions are under the bars now), each with its value and a bar.
    const spells = s.sections.find((sec) => /spell/i.test(sec.title));
    this.onSpells?.(spells?.items ?? []);
    const skills = (s.sections.find((sec) => /skill/i.test(sec.title))?.items ?? [])
      .map((line) => /^(.+?):\s*(-?\d+)$/.exec(line))
      .filter(Boolean)
      .map(([, name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    this.$('#stats-empty').hidden = skills.length > 0;
    this.$('#stats-empty').textContent = has ? 'No skills yet: train them at a trainer.' : 'No skills yet.';
    this.$('#stats-body').replaceChildren(...skills.map((sk) => {
      const row = document.createElement('div');
      row.className = 'skill-row';
      const bar = document.createElement('span');
      bar.className = 'skill-bar';
      bar.style.setProperty('--pct', `${Math.max(0, Math.min(100, sk.value))}%`);
      row.append(text('span', 'skill-name', sk.name), bar, text('span', 'skill-value', String(sk.value)));
      return row;
    }));
  }

  // The short version under the HP/MP bars: attributes, the combat
  // numbers, money and experience, and what you're affected by.
  renderCharStats(s) {
    const box = this.$('#char-stats');
    box.hidden = !s.attributes.length && s.gold === null;
    if (box.hidden) return;
    const abbr = { str: 'STR', int: 'INT', dex: 'DEX', con: 'CON', wis: 'WIS' };
    const attrs = document.createElement('div');
    attrs.className = 'cs-attrs';
    for (const a of s.attributes) {
      const cell = document.createElement('span');
      cell.className = 'cs-attr';
      cell.title = `${a.label}: ${a.base}${a.bonus ? ` ${a.bonus > 0 ? '+' : ''}${a.bonus} from gear and effects` : ''}`;
      const k = text('span', 'cs-key', abbr[a.key] ?? a.key.toUpperCase());
      const v = text('span', 'cs-val', String(a.base + a.bonus));
      cell.append(k, v);
      if (a.bonus) cell.append(text('span', `cs-bonus ${a.bonus > 0 ? 'up' : 'down'}`, a.bonus > 0 ? `+${a.bonus}` : String(a.bonus)));
      attrs.append(cell);
    }
    const facts = document.createElement('div');
    facts.className = 'cs-facts';
    const fact = (label, value, cls = '') => {
      const f = text('span', `cs-fact ${cls}`, '');
      f.append(text('span', 'cs-key', label), ' ', text('span', 'cs-val', value));
      return f;
    };
    const val = (re) => s.values.find((v) => re.test(v.label))?.value;
    const ac = val(/armour|^ac$/i), dam = val(/damage/i), range = val(/^range$/i);
    if (ac != null) facts.append(fact('AC', ac));
    if (dam != null) facts.append(fact('Dmg', dam));
    if (range != null) facts.append(fact('Range', range));
    if (s.gold !== null) facts.append(fact('', `${s.gold} gp`, 'gold'));
    if (s.exp !== null) facts.append(fact('', `${s.exp} exp`, 'exp'));
    const kids = [attrs, facts];
    const affected = playerConditions(s.sections.find((sec) => /affected/i.test(sec.title))?.items ?? []);
    if (affected.length) {
      const conds = document.createElement('div');
      conds.className = 'cs-conds';
      conds.append(...affected.map((c) => text('span', 'cs-cond', c)));
      kids.push(conds);
    }
    box.replaceChildren(...kids);
  }

  // The Shop tab shows while you stand on a merchant, and opens by itself
  // when you step on one; walking off hides it again.
  // Standing on a merchant counts too, like Dusk.java's Merchant button,
  // in case the server never sends the price list.
  setOnMerchant(ent) {
    const was = this.onMerchant?.id ?? null;
    this.onMerchant = ent ?? null;
    if ((ent?.id ?? null) !== was) this.renderShop();
  }

  openShop() {
    const tab = this.tabs.find((t) => t.dataset.tab === 'shop');
    if (!tab.hidden) this.select(tab, true);
  }

  renderShop() {
    const shop = this.player.shop;
    const here = shop.open || !!this.onMerchant;
    const tab = this.tabs.find((t) => t.dataset.tab === 'shop');
    const wasOpen = !tab.hidden;
    tab.hidden = !here;
    if (here && !wasOpen) this.select(tab, true);
    if (!here && wasOpen && tab.getAttribute('aria-selected') === 'true') this.selectByName('inv', !this.collapsed);
    const waiting = here && shop.wares.length === 0;
    this.$('#shop-waiting').hidden = !waiting;
    this.$('#shop-manual').hidden = !waiting;
    if (this.onMerchant) this.$('#shop-merchant').textContent = this.onMerchant.name.replace(/^(<[^>]*>)+/, '');

    // Unknown money (no stats yet) counts as enough, rather than greying
    // everything out.
    const canAfford = (w) => {
      const have = w.currency === 'exp' ? this.exp : this.gold;
      return w.price === null || have == null || w.price <= have;
    };
    const tradeRow = (w, trade) => {
      const price = w.price === null ? '' : `${w.price} ${w.currency}`;
      const li = row(
        [text('span', 'name', w.name), price && text('span', `price ${w.currency}${trade === 'buy' && !canAfford(w) ? ' short' : ''}`, trade === 'sell' ? `worth ${price}` : price)],
        [qtyBox(), tradeButton(trade === 'buy' ? (w.currency === 'exp' ? 'Train' : 'Buy') : 'Sell', trade, w.name)],
      );
      if (trade === 'buy' && !canAfford(w)) li.title = `You can't afford this yet`;
      return li;
    };
    this.$('#shop-buy').replaceChildren(...shop.wares.map((w) => tradeRow(w, 'buy')));
    this.$('#shop-sell').replaceChildren(...shop.sell.map((w) => tradeRow(w, 'sell')));
    this.$('#shop-buy-empty').hidden = shop.wares.length > 0;
    this.$('#shop-sell-empty').hidden = shop.sell.length > 0;
    this.renderShopSummary();
  }

  // The Storage tab shows while a barrel or chest is open: you open one by
  // clicking it, and close it by clicking it again, with Close, or by
  // walking away. entity: the storage prop, or null to close. Returns
  // whether one was just opened (so its contents can be asked for).
  // With box, the storage is your deposit box, reached at that teller.
  setStorage(entity, { box = false } = {}) {
    const was = this.storage?.entity.id ?? null;
    if ((entity?.id ?? null) === was && !!this.storage?.box === box) return false;
    this.storage = entity ? { entity, listing: null, box } : null;
    this.renderStorage();
    return !!entity;
  }

  setStorageListing(listing) {
    if (!this.storage) return;
    this.storage.listing = listing;
    this.renderStorage();
  }

  renderStorage() {
    const st = this.storage;
    const tab = this.tabs.find((t) => t.dataset.tab === 'store');
    const wasOpen = !tab.hidden;
    // A barrel that the server says isn't storage (just a prop) hides it.
    const show = !!st && !st.listing?.none;
    tab.hidden = !show;
    if (show && !wasOpen) this.select(tab, true);
    if (!show && wasOpen && tab.getAttribute('aria-selected') === 'true') this.selectByName('inv', !this.collapsed);
    if (!show) return;
    const name = st.box ? 'deposit box' : st.listing?.name ?? st.entity.name.replace(/^(<[^>]*>)+/, '');
    // A deposit box is private; shared storage says so.
    this.$('#tab-store .store-note').innerHTML = '';
    this.$('#tab-store .store-note').append(st.box ? 'Your own: only you can see what\'s in your ' : 'Shared: anyone can see and take what\'s in the ', Object.assign(document.createElement('span'), { className: 'store-name' }), '.');
    this.$('#store-buy').hidden = !st.listing?.noBox;
    if (st.listing?.noBox) this.$('#store-buy').textContent = `Buy a deposit box (${st.listing.noBox} gp)`;
    for (const el of this.$('#tab-store').querySelectorAll('.store-name')) el.textContent = name;
    const items = st.listing?.items ?? [];
    this.$('#store-waiting').hidden = !!st.listing;
    this.$('#store-in-empty').hidden = !st.listing || items.length > 0;
    const act = (label, kind, data) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.dataset.store = kind;
      Object.assign(b.dataset, data);
      return b;
    };
    this.$('#store-in').replaceChildren(...groupContents(items).map((g) => row(
      [text('span', 'name', g.name), g.count > 1 && text('span', 'count', `×${g.count}`)],
      [act('Take', 'take', { name: g.name })],
    )));
    const mine = this.player.groupedItems();
    this.$('#store-mine').replaceChildren(...mine.map((g) => row(
      [text('span', 'name', g.name), g.ids.length > 1 && text('span', 'count', `×${g.ids.length}`)],
      [act('Put in', 'put', { id: g.ids[0] })],
    )));
    this.$('#store-mine-empty').hidden = mine.length > 0;
  }

  renderShopSummary() {
    this.$('#shop-gold').textContent = this.gold == null ? '' : `${this.gold} gp`;
    this.$('#shop-exp').textContent = this.exp == null ? '' : `${this.exp} exp`;
  }

  renderActions() {
    const sel = this.$('#actions');
    sel.replaceChildren(new Option('Action…', ''), ...this.player.actions.map((a) => new Option(a, a)));
    sel.disabled = this.player.actions.length === 0;
  }
}

export function setBar(el, value, max) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  el.style.setProperty('--pct', `${pct}%`);
  el.classList.toggle('low', max > 0 && pct <= 25);
  el.querySelector('.bar-num').textContent = `${value}/${max}`;
  el.setAttribute('aria-valuenow', value);
  el.setAttribute('aria-valuemax', max);
}

function qtyBox() {
  const q = document.createElement('input');
  q.type = 'number';
  q.className = 'qty';
  q.min = '1';
  q.max = '999';
  q.value = '1';
  q.inputMode = 'numeric';
  q.ariaLabel = 'Quantity';
  return q;
}

function tradeButton(label, trade, name) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.dataset.trade = trade;
  b.dataset.name = name;
  return b;
}

function row(left, right) {
  const li = document.createElement('li');
  const info = document.createElement('span');
  info.className = 'info';
  info.append(...left.filter(Boolean));
  const acts = document.createElement('span');
  acts.className = 'acts';
  acts.append(...right.filter(Boolean));
  li.append(info, acts);
  return li;
}

function text(tag, cls, content) {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = content;
  return el;
}

function button(label, cmd, id, name) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.dataset.cmd = cmd;
  b.dataset.id = id;
  if (name !== undefined) b.dataset.name = name;
  return b;
}
