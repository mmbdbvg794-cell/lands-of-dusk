// Spells as the client sees them: the cast command, which effect to draw
// for a spell, and the chat lines that say a cast failed or landed. No
// DOM; tested in node.
//
// The server (LivingThing.castSpell) takes `cast <spell> [target]`: the
// spell is the first word, or a "quoted name" when it has spaces, and the
// rest is passed to the spell's script, which looks the target up by
// name. Spell scripts only send chat text, so a cast is seen through the
// command we sent and the replies to it.

// Effect kinds js/effects.js can draw, by spell name (as in defSpells on
// the server). Anything unlisted gets 'arcane'.
const KIND = {
  heal: ['mend', 'healing', 'regenerate', 'prayer', 'meditation', 'herbology', 'healing staff', 'counter poison', 'create food', 'create drink'],
  holy: ['bless', 'holy', 'angel strike', "hero's spell", 'armor', 'armour', 'shield', 'reflect', 'focus'],
  fire: ['hells fire', 'ifrit', 'meteor', 'meteo', 'comet', 'asteroid', 'apocolypse', 'bahamut'],
  earth: ['quake', 'bone shards', 'cactuar', 'camoflauge'],
  dark: ['curse', 'death', 'drain', 'corrupt', 'psychopath', 'diablos', 'killer'],
};
const KIND_OF = new Map(Object.entries(KIND).flatMap(([kind, names]) => names.map((n) => [n, kind])));

export function effectKind(spell) {
  return KIND_OF.get(spell.trim().toLowerCase()) ?? 'arcane';
}

// Healing and protective spells go on yourself unless you choose
// otherwise; the rest go on your target.
export function defaultAim(spell) {
  const kind = effectKind(spell);
  return kind === 'heal' || kind === 'holy' ? 'self' : 'target';
}

export function castCommand(spell, targetName) {
  const name = spell.trim();
  const quoted = /\s/.test(name) ? `"${name}"` : name;
  return targetName ? `cast ${quoted} ${targetName}` : `cast ${quoted}`;
}

// Replies that mean the cast didn't happen (castSpell, and the spell
// scripts' own "You do not see them here.").
const FAILED = [
  /^You don't know that spell\.?$/i,
  /^You don't have enough mp to cast that spell\.?$/i,
  /^You do not see them here\.?$/i,
  /^Cast what\??$/i,
  /^You can't do that while you're sleeping/i,
  // Cooling down (server/Skills.java).
  /^You are still gathering your power \(\d+ seconds?\)\.$/i,
  /^.+ is ready again in \d+ seconds?\.$/i,
];
export function isCastFailure(text) {
  const t = text.trim();
  return FAILED.some((re) => re.test(t));
}

// Lines that mean a spell landed on you, cast by someone else. Each gives
// the effect to show on your character.
const LANDED = [
  [/^You feel slightly less wounded\.?$/i, 'heal'],
  [/^You feel (much )?better\.?$/i, 'heal'],
  [/^You feel blessed\.?$/i, 'holy'],
];
export function landedOnMe(text) {
  const t = text.trim();
  for (const [re, kind] of LANDED) if (re.test(t)) return kind;
  return null;
}

// Reads a typed or sent "cast ..." command back into { spell, target }
// (target '' if none), splitting it the way castSpell does. Null if it
// isn't a cast.
export function parseCast(cmd) {
  const m = cmd.trim().match(/^cast\s+(?:"([^"]+)"|(\S+))\s*(.*)$/i);
  if (!m) return null;
  return { spell: (m[1] ?? m[2]).trim(), target: m[3].trim() };
}

// A spell as listed under "-Spells-" in the stats, without the extras
// around the name: this server lists "17 mp) summon bahamut" (the cost
// first); others may add "mend (85%)" or "meteor 40%" after it.
const COST_PREFIX = /^\s*\(?\s*(\d+)\s*mp\s*\)\s*/i;
export function spellName(listed) {
  return listed.trim().replace(COST_PREFIX, '').replace(/\s*[([].*$/, '').replace(/\s+-?\d+%?$/, '').replace(/[:\s]+$/, '').trim();
}

// The MP cost in a listed spell ("17 mp) summon bahamut" -> 17), or null.
export function spellCost(listed) {
  const m = listed.match(COST_PREFIX);
  return m ? Number(m[1]) : null;
}

// Chat templates from js/spellinfo.json (built by tools/spellinfo.py from
// the server's spell scripts), with {name} standing for whoever's named.
// Returns matchers for the caster's lines ("it worked") and the target's
// ("it landed on you"), each giving the spell.
export function compileMessages(info) {
  const toRe = (tpl) => new RegExp(`^${tpl.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{name\\\}/g, '.+')}\\.?$`, 'i');
  const caster = [];
  const target = [];
  for (const [spell, s] of Object.entries(info ?? {})) {
    for (const t of s.caster ?? []) if (!isCastFailure(t.replace(/\{name\}/g, 'x'))) caster.push([toRe(t), spell]);
    for (const t of s.target ?? []) target.push([toRe(t), spell]);
  }
  const find = (list, text) => {
    const t = text.trim();
    for (const [re, spell] of list) if (re.test(t)) return spell;
    return null;
  };
  return { castBy: (text) => find(caster, text), landedBy: (text) => find(target, text) };
}

// ---- spell effects everyone nearby sees ----
//
// Spell scripts on the server add a line such as
//   playsound + 110000000 + * target locx 3000 target locy  target locx  target locy
// DuskEngine.playSound then sends opcode 15 with that number to every
// player who can see (x, y). Numbers from FX_BASE up aren't sounds: they
// carry an effect kind and the square it happened on. (The Java client
// has no sound with such a number, so it ignores them.)
//   FX_BASE + kind * 10,000,000 + x * 3000 + y
export const FX_BASE = 100000000;
export const FX_KINDS = ['', 'heal', 'holy', 'fire', 'earth', 'dark', 'arcane'];
const FX_SPAN = 10000000;
const FX_ROW = 3000;

export function encodeFx(kind, x, y) {
  const k = FX_KINDS.indexOf(kind);
  if (k < 1 || x < 0 || y < 0 || x >= FX_ROW || y >= FX_ROW) return null;
  return FX_BASE + k * FX_SPAN + x * FX_ROW + y;
}

// { kind, x, y } for an effect number, or null for an ordinary sound.
export function decodeFx(n) {
  if (!Number.isFinite(n) || n < FX_BASE + FX_SPAN) return null;
  const v = n - FX_BASE;
  const kind = FX_KINDS[Math.floor(v / FX_SPAN)];
  if (!kind) return null;
  const rest = v % FX_SPAN;
  return { kind, x: Math.floor(rest / FX_ROW), y: rest % FX_ROW };
}

// The stats' spell list as this server writes it (LivingThing, with
// SpellGroup.spellList for each school):
//   clerical group: 45%        a school and your skill in it
//     5 mp) mend               its spells you know, with their cost
//   Following: ...             not a spell
// Returns { spells: [{ name, cost, group }], groups: { name: skill } }.
// Lines that are neither are left out, so other servers' plainer lists
// (just names) still work: a bare name counts as a spell.
export function parseSpellList(lines) {
  const spells = [];
  const groups = {};
  let group = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^(.+?):\s*(-?\d+)\s*%$/))) {
      group = m[1].trim();
      groups[group] = Number(m[2]);
    } else if (COST_PREFIX.test(line)) {
      spells.push({ name: spellName(line), cost: spellCost(line), group });
    } else if (/^following\b/i.test(line) || line.includes(':')) {
      // "Following: ..." and other notes aren't spells.
    } else if (spellName(line)) {
      spells.push({ name: spellName(line), cost: null, group });
    }
  }
  return { spells, groups };
}

// ---- cooldowns ----
// After a cast the server (server/Skills.java, web players only) says
// "Cooldown: <spell>|<its own wait, s>|<the wait after any spell, s>".
export function parseCooldown(line) {
  const m = /^Cooldown: (.+)\|(\d+)\|(\d+)$/.exec(line.trim());
  return m ? { spell: m[1].toLowerCase(), own: Number(m[2]), any: Number(m[3]) } : null;
}

// When each spell is ready again. left(spell, now) is the ms to wait (0 when
// ready): its own wait or the one after any spell, whichever is longer.
export class Cooldowns {
  constructor() {
    this.ready = new Map(); // spell (lower case) -> ms
    this.anyReady = 0;
  }

  start({ spell, own, any }, now) {
    this.anyReady = Math.max(this.anyReady, now + any * 1000);
    if (own > 0) this.ready.set(spell, now + own * 1000);
  }

  left(spell, now) {
    const own = this.ready.get(String(spell).toLowerCase()) ?? 0;
    return Math.max(0, Math.max(own, this.anyReady) - now);
  }

  get active() {
    return this.anyReady > 0 || this.ready.size > 0;
  }

  // Forgets waits that are over.
  tidy(now) {
    for (const [k, t] of this.ready) if (t <= now) this.ready.delete(k);
    if (this.anyReady <= now) this.anyReady = 0;
  }
}

// "12s", "1:05": a wait, short.
export const waitLabel = (ms) => {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
};
