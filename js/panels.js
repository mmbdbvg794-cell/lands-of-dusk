// The side column: the character card (name, location, HP/MP/stamina
// bars), and the Inventory, Equipment and Stats tabs plus the Action
// menu, standing in for the Java client's pnlStats and EquipmentFrame.
// Every command goes out through `send`, just as if it had been typed.

import { slotForType, command } from './player.js';
import { parseStats } from './stats.js';
import { buyCommand, sellCommand } from './shop.js';

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
    this.send(cmd === 'use' ? command.use(name) : command[cmd](id));
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
    }
  }

  renderAll() {
    for (const part of ['status', 'items', 'equipment', 'stats', 'actions', 'shop']) this.update(part);
  }

  renderStatus() {
    const p = this.player;
    this.$('#char-name').textContent = p.name ?? '—';
    setBar(this.$('#bar-hp'), p.hp, p.maxhp);
    setBar(this.$('#bar-mp'), p.mp, p.maxmp);
    this.$('#stat-loc').textContent = `${p.x}, ${p.y}`;
  }

  renderItems() {
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

  renderEquipment() {
    const eq = this.player.equipment;
    this.$('#equip-list').replaceChildren(
      ...SLOT_GRID.map((slot) => {
        const item = eq[slot];
        const li = document.createElement('li');
        if (!item) li.className = 'empty-slot';
        li.append(text('span', 'slot-label', SLOT_LABELS[slot]), text('span', 'slot-item', item ? item.name : 'empty'));
        if (item) {
          const b = button('×', 'unwear', item.id);
          b.className = 'remove';
          b.title = b.ariaLabel = `Remove ${item.name}`;
          li.append(b);
        }
        return li;
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

    const secs = [];
    if (s.attributes.length) {
      secs.push(section('Attributes', table(s.attributes.map((a) => {
        const kind = a.bonus > 0 ? 'up' : a.bonus < 0 ? 'down' : 'zero';
        return [a.label, [String(a.base), 'num'], [a.bonus > 0 ? `+${a.bonus}` : String(a.bonus), `bonus ${kind}`]];
      }))));
    }
    const values = [...s.values.map((v) => [v.label, [v.value, 'num']]),
      ...s.bars.map((b) => [b.label, [`${b.value}/${b.max}`, 'num']])];
    if (values.length) secs.push(section('Combat', table(values)));
    const spells = s.sections.find((sec) => /spell/i.test(sec.title));
    this.onSpells?.(spells?.items ?? []);
    for (const sec of s.sections) {
      if (sec === spells) continue; // shown in the Spellbook tab
      const body = sec.items.length
        ? chips(sec.items)
        : text('span', 'none', 'none');
      secs.push(section(sec.title, body));
    }
    if (s.other.length) secs.push(section('Other', text('div', 'plain', s.other.join('\n'))));
    this.$('#stats-body').replaceChildren(...secs);
  }

  // The Shop tab shows while you stand on a merchant, and opens by itself
  // when you step on one; walking off hides it again.
  renderShop() {
    const shop = this.player.shop;
    const tab = this.tabs.find((t) => t.dataset.tab === 'shop');
    const wasOpen = !tab.hidden;
    tab.hidden = !shop.open;
    if (shop.open && !wasOpen) this.select(tab, true);
    if (!shop.open && wasOpen && tab.getAttribute('aria-selected') === 'true') this.selectByName('inv', !this.collapsed);

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

function section(title, body) {
  const div = document.createElement('div');
  div.className = 'stat-section';
  div.append(text('h4', '', title), body);
  return div;
}

// rows: [label, [text, class], ...]
function table(rows) {
  const t = document.createElement('table');
  t.className = 'stat-table';
  for (const [label, ...cells] of rows) {
    const tr = t.insertRow();
    tr.insertCell().textContent = label;
    for (const [content, cls] of cells) {
      const td = tr.insertCell();
      td.textContent = content;
      td.className = cls;
    }
  }
  return t;
}

function chips(items) {
  const div = document.createElement('div');
  div.className = 'chips';
  div.append(...items.map((i) => text('span', 'chip', i)));
  return div;
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
