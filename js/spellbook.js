// The Spellbook tab: the spells you know (from the "-Spells-" part of the
// stats), laid out like a book with a chapter per school. Descriptions and
// the skill each spell needs come from js/spellinfo.json, built from the
// server's own spell files by tools/spellinfo.py.

import { effectKind, parseSpellList } from './spells.js';

const GLYPH = { heal: '✚', holy: '✦', fire: '🔥', earth: '⛰', dark: '☾', arcane: '✧' };

export class Spellbook {
  // `cast(spell, atTarget)` casts; `toHotbar(spell)` puts it in a free
  // slot; `hasTarget()` says whether something is targeted.
  constructor(el, { cast, toHotbar, hasTarget }) {
    this.el = el;
    this.info = {};
    this.known = [];
    this.costs = new Map(); // spell -> MP, when the stats list it
    this.schoolOf = new Map(); // spell -> its school, as the stats group it
    this.skills = {}; // school -> your skill in it (%)
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-spell]');
      if (!b) return;
      const spell = b.dataset.spell;
      if (b.dataset.act === 'self') cast(spell, false);
      else if (b.dataset.act === 'target') cast(spell, true);
      else if (b.dataset.act === 'hotbar') {
        const slot = toHotbar(spell);
        b.textContent = slot ? `In slot ${slot}` : 'Hotbar full';
        setTimeout(() => (b.textContent = '+ Hotbar'), 1500);
      }
    });
    this.hasTarget = hasTarget;
  }

  setInfo(info) {
    this.info = info ?? {};
    this.render();
  }

  // `listed` is the stats' "-Spells-" lines.
  setKnown(listed) {
    const { spells, groups } = parseSpellList(listed);
    this.costs = new Map(spells.filter((s) => s.cost !== null).map((s) => [s.name, s.cost]));
    this.schoolOf = new Map(spells.filter((s) => s.group).map((s) => [s.name, s.group]));
    this.skills = groups;
    this.known = [...new Set(spells.map((s) => s.name))];
    this.render();
  }

  // Called when the target changes, to enable or grey out "At target".
  refreshTarget() {
    const has = this.hasTarget();
    for (const b of this.el.querySelectorAll('button[data-act="target"]')) b.disabled = !has;
  }

  render() {
    const book = document.createElement('div');
    book.className = 'book';
    const title = document.createElement('h3');
    title.className = 'book-title';
    title.textContent = 'Spellbook';
    book.append(title);

    if (!this.known.length) {
      const p = document.createElement('p');
      p.className = 'book-empty';
      p.textContent = 'These pages are blank. The spells you learn will be written here.';
      book.append(p);
      this.el.replaceChildren(book);
      return;
    }

    // Chapters by school, in the order the server lists each school's spells.
    const chapters = new Map();
    for (const spell of this.known) {
      const info = this.info[spell.toLowerCase()] ?? this.info[spell];
      // The stats say which school a spell is in; spellinfo.json as backup.
      const school = this.schoolOf.get(spell) ?? info?.group ?? 'Other spells';
      if (!chapters.has(school)) chapters.set(school, []);
      chapters.get(school).push({ spell, info });
    }
    const hasTarget = this.hasTarget();
    for (const [school, spells] of chapters) {
      const h = document.createElement('h4');
      h.className = 'chapter';
      h.textContent = school.replace(/\s+group$/i, '');
      const skill = this.skills[school];
      if (skill !== undefined) {
        const s = document.createElement('span');
        s.className = 'school-skill';
        s.textContent = `${skill}%`;
        s.title = `Your skill in ${school}`;
        h.append(' ', s);
      }
      book.append(h);
      spells.sort((a, b) => (a.info?.order ?? 99) - (b.info?.order ?? 99) || a.spell.localeCompare(b.spell));
      for (const { spell, info } of spells) book.append(this.entry(spell, info, hasTarget));
    }
    this.el.replaceChildren(book);
  }

  entry(spell, info, hasTarget) {
    const kind = effectKind(spell);
    const div = document.createElement('article');
    div.className = `spell ${kind}`;
    const head = document.createElement('div');
    head.className = 'spell-head';
    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    glyph.textContent = GLYPH[kind];
    glyph.setAttribute('aria-hidden', 'true');
    const name = document.createElement('h5');
    name.textContent = spell;
    head.append(glyph, name);
    const cost = this.costs.get(spell);
    if (cost !== undefined) {
      const mp = document.createElement('span');
      mp.className = 'cost';
      mp.textContent = `${cost} MP`;
      mp.title = `Costs ${cost} MP to cast`;
      head.append(mp);
    }
    if (info?.needs !== undefined) {
      const needs = document.createElement('span');
      needs.className = 'needs';
      needs.textContent = info.needs > 0 ? `${info.needs}% skill` : 'novice';
      needs.title = `Needs ${info.needs}% in ${info.group}`;
      head.append(needs);
    }
    div.append(head);
    if (info?.description) {
      const d = document.createElement('p');
      d.className = 'desc';
      d.textContent = info.description;
      div.append(d);
    }
    const acts = document.createElement('div');
    acts.className = 'spell-acts';
    const btn = (label, act, disabled = false) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.dataset.spell = spell;
      b.dataset.act = act;
      b.disabled = disabled;
      return b;
    };
    acts.append(btn('On me', 'self'), btn('At target', 'target', !hasTarget), btn('+ Hotbar', 'hotbar'));
    div.append(acts);
    return div;
  }
}
