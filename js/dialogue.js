// NPC dialogue made in the God tab's editor: the shape it's kept in, and
// the talk script (server/Talk.java) it becomes. No DOM; tested in node.
//
// A dialogue is
//   { shouts: ['Hey you!', ...],            what the NPC calls out nearby
//     stages: [                             checked in order; the first
//       { when: { kind, value },            that fits the player is used
//         says: 'Will you help us?',
//         answers: [{ label: 'yes', reply: 'Bless you!', effects: [...] }] },
//     ] }
// when.kind: 'always' | 'flag' (the player has it) | 'noflag' | 'item'
// (carries it) | 'gold' (has at least that much) | 'race'|'norace' (value
// human, elf...) | 'sex' (value male or female). Effects: { kind:
// 'give'|'take', item }, { kind: 'gold'|'takegold'|'exp', amount }, { kind:
// 'flag'|'unflag', flag }, { kind: 'teleport', x, y }. An answer can also
// have needs: { kind: 'gold'|'item'|'flag', value } (said to be missing
// otherwise) and next: a follow-up question { says, answers } of its own.
// A stage can also have `also` (a second condition, both must hold) and
// `lines` (other things to say instead of `says`, one picked at random).
// An answer with `once: { flag, minutes, says }` works once per player
// (`flag` remembers it), or again after `minutes` (server/Quests.java
// flagtimer takes the flag away then); otherwise they're told `says`.
// Anything said can hold {male|female} words (see bySex).
// Flags are conditions on the player (a quest remembers where you got to
// with them); the server makes a hidden condition file for each.

export const newDialogue = () => ({
  shouts: [],
  stages: [{ when: { kind: 'always', value: '' }, says: '', answers: [] }],
});

// Fills in what a dialogue left out (empty lists, missing text), so one
// written by hand or by a tool (tools/world/city.mjs) opens in the editor.
export function tidyDialogue(dlg) {
  const d = dlg && typeof dlg === 'object' ? dlg : {};
  const node = (n) => {
    n.says = n.says ?? '';
    n.answers = Array.isArray(n.answers) ? n.answers : [];
    for (const a of n.answers) {
      a.label = a.label ?? '';
      a.reply = a.reply ?? '';
      a.effects = Array.isArray(a.effects) ? a.effects : [];
      if (a.next) node(a.next);
    }
    return n;
  };
  d.shouts = Array.isArray(d.shouts) ? d.shouts : [];
  d.stages = Array.isArray(d.stages) && d.stages.length ? d.stages : newDialogue().stages;
  for (const st of d.stages) {
    st.when = st.when ?? { kind: 'always', value: '' };
    node(st);
  }
  return d;
}

// A flag name the server can keep as a condition file.
export const cleanFlag = (s) => String(s ?? '').trim().replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40);

// Text inside a script string: the script language has no escapes.
// The server reads scripts a byte at a time, so typographic punctuation
// (from phones and word processors) would arrive garbled: plain versions.
const PLAIN = { '\u2014': ' - ', '\u2013': '-', '\u2018': "'", '\u2019': "'", '\u201c': "'", '\u201d': "'", '\u2026': '...', '\u00a0': ' ' };
const plain = (s) => String(s ?? '').replace(/[\u2014\u2013\u2018\u2019\u201c\u201d\u2026\u00a0]/g, (c) => PLAIN[c]).replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '');
const text = (s) => plain(s).replace(/"/g, "'").replace(/[\r\n]+/g, ' ').replace(/ {2,}/g, ' ').trim();
// Answers are compared exactly, so they're kept lower case (the buttons
// show them capitalised).
export const cleanLabel = (s) => text(s).toLowerCase().replace(/[()/]/g, ' ').replace(/\s+/g, ' ').trim();
// The same without punctuation: typed answers often leave it out ("here sir"
// for "here, sir"), so a script takes either (the case never matters).
export const looseLabel = (s) => cleanLabel(s).replace(/'/g, '').replace(/[?.,!;:"-]/g, ' ').replace(/\s+/g, ' ').trim();
// The script's test for an answer: the label, or it without punctuation.
const answerIs = (v, label) => {
  const clean = cleanLabel(label), loose = looseLabel(label);
  return loose && loose !== clean ? `or strequals ${v} "${clean}" strequals ${v} "${loose}"` : `strequals ${v} "${clean}"`;
};

// The races, for conditions and walking rules: [id, name].
export const RACES = [['human', 'Human'], ['elf', 'Elf'], ['darkelf', 'Dark elf'], ['lizardman', 'Lizardman']];

// A player's sex (server/Sex.java): the hidden flag "female" decides; anyone
// without it, including those who haven't chosen yet, counts as male.
export const SEXES = [['male', 'Male'], ['female', 'Female']];
const sexCondition = (v) => (v === 'female' ? 'hasCondition trigger female' : '! hasCondition trigger female');

// Words that depend on who's listening, written {male|female} or
// {male|female|not chosen yet}: "Welcome, {sir|madam}!". bySex(s, sex)
// picks the words for 'male', 'female' or '' (not chosen: the third, else
// the first).
const SEXED = /\{([^{}|]*)\|([^{}|]*)(?:\|([^{}|]*))?\}/g;
export const hasSexed = (s) => new RegExp(SEXED.source).test(String(s ?? ''));
export const bySex = (s, sex) => String(s ?? '').replace(SEXED, (_, m, f, n) => (sex === 'female' ? f : sex === 'male' ? m : n ?? m));

// A chat line, once for each kind of listener when it has {male|female} words.
function chatTo(out, pad, line) {
  if (!hasSexed(line)) return out.push(`${pad}chat trigger "${line}"`);
  const [m, f, n] = ['male', 'female', ''].map((x) => bySex(line, x));
  out.push(`${pad}if hasCondition trigger female`, `${pad}\tchat trigger "${f}"`, `${pad}end`);
  if (n === m) return out.push(`${pad}if ! hasCondition trigger female`, `${pad}\tchat trigger "${m}"`, `${pad}end`);
  out.push(`${pad}if hasCondition trigger male`, `${pad}\tchat trigger "${m}"`, `${pad}end`,
    `${pad}if and ! hasCondition trigger male ! hasCondition trigger female`, `${pad}\tchat trigger "${n}"`, `${pad}end`);
}

function condition(when) {
  const v = when?.value;
  switch (when?.kind) {
    case 'flag': return cleanFlag(v) && `hasCondition trigger ${cleanFlag(v)}`;
    case 'noflag': return cleanFlag(v) && `! hasCondition trigger ${cleanFlag(v)}`;
    case 'item': return text(v) && `hasItem trigger "${text(v)}"`;
    case 'gold': return Number(v) > 0 && `! < trigger cash ${Math.floor(Number(v))}`;
    case 'race': return cleanFlag(v) && `isRace trigger ${cleanFlag(v).toLowerCase()}`;
    case 'norace': return cleanFlag(v) && `! isRace trigger ${cleanFlag(v).toLowerCase()}`;
    case 'sex': return sexCondition(v);
    default: return null;
  }
}

function effect(e, pad) {
  switch (e.kind) {
    case 'give': return text(e.item) ? `${pad}giveitem trigger "${text(e.item)}"` : null;
    case 'take': return text(e.item) ? `${pad}removeItem trigger "${text(e.item)}"` : null;
    case 'gold': return Number(e.amount) > 0 ? `${pad}inc trigger cash ${Math.floor(Number(e.amount))}` : null;
    case 'takegold': return Number(e.amount) > 0 ? `${pad}inc trigger cash - 0 ${Math.floor(Number(e.amount))}` : null;
    case 'exp': return Number(e.amount) > 0 ? `${pad}inc trigger exp ${Math.floor(Number(e.amount))}` : null;
    case 'flag': return cleanFlag(e.flag) ? `${pad}addCondition trigger ${cleanFlag(e.flag)}` : null;
    case 'unflag': return cleanFlag(e.flag) ? `${pad}removeCondition trigger ${cleanFlag(e.flag)}` : null;
    // Renting a house (server/Housing.java): "rent" or "info"; the hidden
    // rentnow lets the order through, as only a conversation can give it.
    case 'rent': return ['rent', 'info'].includes(e.what) ? `${pad}addCondition trigger rentnow\n${pad}order trigger "house ${e.what}"` : null;
    case 'teleport': return Number.isFinite(Number(e.x)) && Number.isFinite(Number(e.y)) && e.x !== '' && e.y !== '' ? `${pad}set trigger locxy ${Math.floor(Number(e.x))} ${Math.floor(Number(e.y))}` : null;
    // Where they come back to after dying. The script language's own "set
    // trigger bindlocx" stores 0 on this server, so the server sets it
    // (server/Skills.java): bindnow lets the order through, once.
    case 'bind': return Number.isFinite(Number(e.x)) && Number.isFinite(Number(e.y)) && e.x !== '' && e.y !== '' ? `${pad}addCondition trigger bindnow\n${pad}order trigger "bindat ${Math.floor(Number(e.x))} ${Math.floor(Number(e.y))}"` : null;
    default: return null;
  }
}

// A stage's condition, with its second one if it has one ("and" comes
// first in the script language).
function stageCondition(stage) {
  const a = condition(stage.when);
  const b = stage.also ? condition(stage.also) : null;
  if (a && b) return `and ${a} ${b}`;
  return a || b || null;
}

// "a sword", "an apple", "Elowen's letter" (a name takes none).
const withA = (item) => (/^[A-Z]/.test(item) ? item : `${/^[aeiou]/i.test(item) ? 'an' : 'a'} ${item}`);

// What an answer needs before it works (answer.needs): the check, and
// what the NPC says when it isn't met.
function needs(n, who) {
  const v = n?.value;
  switch (n?.kind) {
    case 'gold': return Number(v) > 0 ? [`< trigger cash ${Math.floor(Number(v))}`, `${who} says: You don't have enough gold for that. It's ${Math.floor(Number(v))} gp.`] : null;
    case 'item': return text(v) ? [`! hasItem trigger "${text(v)}"`, `${who} says: You'll need ${withA(text(v))} for that.`] : null;
    case 'flag': return cleanFlag(v) ? [`! hasCondition trigger ${cleanFlag(v)}`, `${who} says: You can't do that yet.`] : null;
    default: return null;
  }
}

// An answer that works once (or once per wait): its flag.
export const ONCE_SAYS = "I've already done that for you.";
export const TIMER_FLAG = 'timernow';
const onceFlag = (a) => (a?.once ? cleanFlag(a.once.flag) : '');
// A flag name for a new once-only answer, from the NPC's name.
export const newOnceFlag = (npc) => `once_${cleanFlag(npc).toLowerCase().slice(0, 20)}_${Math.random().toString(36).slice(2, 7)}`;

export const MAX_DEPTH = 4; // follow-up questions inside follow-up questions

// How a line is spoken: "<who> says: ...", shouts, asks, whispers, or an
// action ("<who> acts: The guard looks you up and down."), which the client
// shows as just the words, in italics.
export const VERBS = [['says', 'Says'], ['shouts', 'Shouts'], ['asks', 'Asks'], ['whispers', 'Whispers'], ['acts', 'Action']];
const verbOf = (v) => (VERBS.some(([k]) => k === v) ? v : 'says');
const spoken = (who, verb, words) => `${who} ${verbOf(verb)}: ${words}`;

// A question: what's said, then its answers (each of which can ask a
// follow-up question), at depth `depth` (0 for a stage's own question).
function question(out, who, node, pad, depth) {
  const said = [node.says, ...(node.lines ?? [])].map(text).filter(Boolean);
  if (said.length < 2) return ask(out, who, node, said[0] ?? '', pad, depth);
  // One of them at random. The script language's number variables don't
  // hold "rand" (they come out 0), so each line but the last is its own
  // branch, taken with the odds that make them all equally likely
  // (1 in 3, then 1 in 2, then the last), each ending the script.
  const k = said.length;
  said.forEach((line, i) => {
    if (i === k - 1) return ask(out, who, node, line, pad, depth);
    out.push(`${pad}if < rand ${(1 / (k - i)).toFixed(4)}`);
    ask(out, who, node, line, pad + '\t', depth);
    out.push(`${pad}\tendscript`, `${pad}end`);
  });
}

function ask(out, who, node, line, pad, depth) {
  const answers = (node.answers ?? []).filter((a) => cleanLabel(a.label));
  const choices = answers.length ? ` (${answers.map((a) => cleanLabel(a.label)).join('/')})` : '';
  if (line || choices) chatTo(out, pad, spoken(who, node.verb, line + choices));
  if (!answers.length) return;
  const v = depth ? `answer${depth + 1}` : 'answer';
  out.push(`${pad}input trigger ${v}`);
  for (const a of answers) {
    out.push(`${pad}if ${answerIs(v, a.label)}`);
    const once = onceFlag(a);
    if (once) {
      out.push(`${pad}\tif hasCondition trigger ${once}`);
      chatTo(out, `${pad}\t\t`, spoken(who, 'says', text(a.once.says) || ONCE_SAYS));
      out.push(`${pad}\t\tendscript`, `${pad}\tend`);
    }
    const need = needs(a.needs, who);
    if (need) out.push(`${pad}\tif ${need[0]}`, `${pad}\t\tchat trigger "${need[1]}"`, `${pad}\t\tendscript`, `${pad}\tend`);
    for (const e of a.effects ?? []) {
      const line2 = effect(e, pad + '\t');
      if (line2) out.push(line2);
    }
    if (once) {
      out.push(`${pad}\taddCondition trigger ${once}`);
      const mins = Math.floor(Number(a.once.minutes) || 0);
      if (mins > 0) out.push(`${pad}\taddCondition trigger ${TIMER_FLAG}`, `${pad}\torder trigger "flagtimer ${once} ${mins}"`);
    }
    if (text(a.reply)) chatTo(out, `${pad}\t`, spoken(who, a.replyVerb, text(a.reply)));
    if (a.next && depth + 1 < MAX_DEPTH) question(out, who, a.next, pad + '\t', depth + 1);
    out.push(`${pad}\tendscript`, `${pad}end`);
  }
  out.push(`${pad}chat trigger "${who} says: Hm? Talk to me again when you've made up your mind."`);
}

// The talk script for an NPC called `name`.
export function toScript(name, dlg) {
  const who = text(name);
  const out = [
    `#${who}'s dialogue, made with the God tab's dialogue editor.`,
    '#Change it there: saving the editor rewrites this file.',
  ];
  let always = false;
  for (const stage of dlg.stages ?? []) {
    const cond = stageCondition(stage);
    const pad = cond ? '\t' : '';
    if (cond) out.push(`if ${cond}`);
    question(out, who, stage, pad, 0);
    out.push(`${pad}endscript`);
    if (cond) out.push('end');
    else { always = true; break; } // an "always" stage: nothing after it is reached
  }
  // No stage fitted: a hint, rather than silence, that they're waiting on
  // something (a flag, an item...).
  if (!always) out.push(`chat trigger "${who} doesn't seem to notice you."`);
  out.push('endscript');
  return out.join('\n') + '\n';
}

// The .greet file: one shout per line. Shouts reach everyone nearby at
// once, so {male|female} words take their not-chosen (or male) form.
export const toGreet = (dlg) => (dlg.shouts ?? []).map((x) => text(bySex(x, ''))).filter(Boolean).join('\n');

// Every flag the dialogue uses, so the server can make their files.
export function flagsOf(dlg) {
  const flags = new Set();
  const walk = (node) => {
    for (const a of node.answers ?? []) {
      for (const e of a.effects ?? []) if (e.kind === 'flag' || e.kind === 'unflag') flags.add(cleanFlag(e.flag));
      if (a.needs?.kind === 'flag') flags.add(cleanFlag(a.needs.value));
      if (onceFlag(a)) {
        flags.add(onceFlag(a));
        if (Number(a.once.minutes) > 0) flags.add(TIMER_FLAG);
      }
      if (a.next) walk(a.next);
    }
  };
  for (const stage of dlg.stages ?? []) {
    for (const w of [stage.when, stage.also]) if (w?.kind === 'flag' || w?.kind === 'noflag') flags.add(cleanFlag(w.value));
    walk(stage);
  }
  flags.delete('');
  return [...flags];
}

// The journal entries written on "Set flag" effects (e.journal: { title,
// text, done }), one per flag: [{ flag, title, text, done }].
export function journalEntriesOf(dlg) {
  const out = new Map();
  const walk = (node) => {
    for (const a of node.answers ?? []) {
      for (const e of a.effects ?? []) {
        const flag = cleanFlag(e.flag);
        if (e.kind === 'flag' && flag && e.journal?.title?.trim()) {
          out.set(flag, { flag, title: e.journal.title.trim(), text: (e.journal.text ?? '').trim(), done: !!e.journal.done });
        }
      }
      if (a.next) walk(a.next);
    }
  };
  for (const stage of dlg.stages ?? []) walk(stage);
  return [...out.values()];
}

// Fills each "Set flag" effect's journal fields from the journal (entries
// by flag, lower case), where the journal has one.
export function fillJournal(dlg, entries) {
  const walk = (node) => {
    for (const a of node.answers ?? []) {
      for (const e of a.effects ?? []) {
        const j = e.kind === 'flag' && entries.get(cleanFlag(e.flag).toLowerCase());
        if (j) e.journal = { title: j.title, text: j.text, done: j.done };
      }
      if (a.next) walk(a.next);
    }
  };
  for (const stage of dlg.stages ?? []) walk(stage);
  return dlg;
}

// Base64 for UTF-8 text (the editor's files travel in one command line).
export const toBase64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
export const fromBase64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));

// The command that saves a dialogue, and the one that asks for it.
export function saveCommand(name, dlg) {
  return `talkedit set ${name}|${toBase64(JSON.stringify(dlg))}|${toBase64(toScript(name, dlg))}|${toBase64(toGreet(dlg))}|${flagsOf(dlg).join(',')}`;
}
export const loadCommand = (name) => `talkedit get ${name}`;

// The server's answer to loadCommand: "Dialogue: <name>|<base64 JSON>",
// with nothing after the bar for a new one, or "!" for a hand-written
// script the editor didn't make. Returns { name, dialogue, handWritten }.
export function parseDialogueReply(line) {
  const m = /^Dialogue: (.*)\|(.*)$/.exec(line.trim());
  if (!m) return null;
  const [, name, data] = m;
  if (data === '!') return { name, dialogue: newDialogue(), handWritten: true };
  if (!data) return { name, dialogue: newDialogue(), handWritten: false };
  try {
    return { name, dialogue: JSON.parse(fromBase64(data)), handWritten: false };
  } catch {
    return { name, dialogue: newDialogue(), handWritten: false };
  }
}

// ---- tile actions ----
//
// What happens when someone steps on a square: rules checked in order,
// the first that fits is used. A rule is
//   { when: { kind, value }, speaker, says, effects: [...] }
// with the same conditions and effects as dialogue; the message is said
// by `speaker` if there is one (shown in the speech box), else just shown.

export const newRule = () => ({ when: { kind: 'always', value: '' }, speaker: '', says: '', effects: [] });

export function toTileScript(rules) {
  const out = ['#Tile action, made in the God tab.', '#Change it there: saving the tile editor rewrites this file.'];
  for (const r of rules ?? []) {
    // (A rule can have a second condition too, as a stage can: r.also.)
    const cond = stageCondition(r);
    const pad = cond ? '\t' : '';
    if (cond) out.push(`if ${cond}`);
    for (const e of r.effects ?? []) {
      const line = effect(e, pad);
      if (line) out.push(line);
    }
    if (text(r.says)) chatTo(out, pad, tileLine(r));
    out.push(`${pad}endscript`);
    if (cond) out.push('end');
    else break; // an "always" rule: nothing after it is reached
  }
  out.push('endscript');
  return out.join('\n') + '\n';
}

// Who can step onto the square (walk): { kind: 'everyone'|'flag'|'noflag'
// |'race'|'norace'|'raceorflag'|'nobody', flag, race, speaker, says } -> the
// server's can-move expression
// (empty for everyone) and what a player who can't is told. Gods walk
// anywhere regardless.
export const newWalk = () => ({ kind: 'everyone', flag: '', speaker: '', says: '' });
export function canMoveExpr(walk) {
  const f = cleanFlag(walk?.flag);
  switch (walk?.kind) {
    case 'flag': return f ? `hasCondition trigger ${f}` : '';
    case 'noflag': return f ? `! hasCondition trigger ${f}` : '';
    // The race is kept in .flag too (human, elf, darkelf, lizardman).
    case 'race': return f ? `isRace trigger ${f.toLowerCase()}` : '';
    case 'norace': return f ? `! isRace trigger ${f.toLowerCase()}` : '';
    // Of the race, or with the flag (the script's "or" comes first).
    case 'raceorflag': {
      const r = cleanFlag(walk.race)?.toLowerCase();
      if (r && f) return `or isRace trigger ${r} hasCondition trigger ${f}`;
      return r ? `isRace trigger ${r}` : f ? `hasCondition trigger ${f}` : '';
    }
    case 'nobody': return 'false';
    default: return '';
  }
}
export const blockedText = (walk) => (text(walk?.says) ? bySex(tileLine(walk), '') : '');
// A tile's message: from a speaker (said, shouted... or an action), or just
// the words when no one says it.
export function tileLine(r) {
  return text(r.speaker) ? spoken(text(r.speaker), r.verb, text(r.says)) : text(r.says);
}

export function tileFlagsOf(rules, walk) {
  const flags = new Set(flagsOf({ stages: (rules ?? []).map((r) => ({ when: r.when, answers: [{ label: 'x', effects: r.effects }] })) }));
  if ((walk?.kind === 'flag' || walk?.kind === 'noflag' || walk?.kind === 'raceorflag') && cleanFlag(walk.flag)) flags.add(cleanFlag(walk.flag));
  return [...flags];
}

export const TILE_GET = 'tileget';
// data: { rules, walk }.
export function tileSaveCommand({ rules, walk }) {
  return `tileset ${toBase64(JSON.stringify({ rules, walk }))}|${toBase64(toTileScript(rules))}|${tileFlagsOf(rules, walk).join(',')}|${toBase64(canMoveExpr(walk))}|${toBase64(blockedText(walk))}`;
}

// The server's answer to TILE_GET: "TileAction: <x>_<y>|<base64 data>",
// empty for none, "!" for a script it didn't make. { x, y, rules, walk,
// other }. (Saved before walking rules, the data was just the rules.)
// Saving or setting aside a hand-written script: "TileScript: saved|replaced <x>_<y>".
export const tileScriptCommand = (text, force = false) => `tilescript ${force ? 'force ' : ''}${toBase64(text)}`;
export const TILE_SCRIPT_REPLACE = 'tilescript replace';
export function parseTileScriptReply(line) {
  const m = /^TileScript: (saved|replaced) (-?\d+)_(-?\d+)$/.exec(line.trim());
  return m ? { done: m[1], x: Number(m[2]), y: Number(m[3]) } : null;
}

export function parseTileReply(line) {
  const m = /^TileAction: (-?\d+)_(-?\d+)\|(.*)$/.exec(line.trim());
  if (!m) return null;
  const [, x, y, data] = m;
  // A script written by hand (with its text, from servers that send it).
  if (data.startsWith('!')) {
    let script = '';
    try { script = data.length > 1 ? fromBase64(data.slice(1)) : ''; } catch { /* shown empty */ }
    return { x: Number(x), y: Number(y), rules: [], walk: newWalk(), other: true, script };
  }
  let rules = [newRule()];
  let walk = newWalk();
  if (data) {
    try {
      const saved = JSON.parse(fromBase64(data));
      if (Array.isArray(saved)) rules = saved;
      else { rules = saved.rules ?? rules; walk = saved.walk ?? walk; }
    } catch { /* start afresh */ }
  }
  return { x: Number(x), y: Number(y), rules, walk, other: false };
}

// ---- trying a conversation out (the editor's "Try it") ----
// A pretend player: { flags: Set of lower-case flags, items: [names],
// gold, race, sex ('male' or 'female') }. No server involved; it follows the same rules the
// script does.

function holds(when, p) {
  const v = String(when?.value ?? '').trim().toLowerCase();
  switch (when?.kind) {
    case 'always': return true;
    case 'flag': return p.flags.has(cleanFlag(v).toLowerCase());
    case 'noflag': return !p.flags.has(cleanFlag(v).toLowerCase());
    case 'item': return p.items.some((i) => i.toLowerCase() === v);
    case 'gold': return p.gold >= (Number(v) || 0);
    case 'race': return p.race === v;
    case 'norace': return p.race !== v;
    case 'sex': return (p.sex === 'female') === (v === 'female');
    default: return true;
  }
}

// The stage that fits the player first, or -1 (they're ignored).
export function stageFor(dlg, p) {
  return (dlg.stages ?? []).findIndex((st) => holds(st.when, p) && (!st.also || holds(st.also, p)));
}

// Answering: { lines: [what's said, and what happened], next } with the
// player changed as the server would change them; or { lines } alone when
// the answer is refused (needs something, or already done).
export function tryAnswer(a, p, who) {
  const name = text(who) || 'They';
  const once = onceFlag(a).toLowerCase();
  if (once && p.flags.has(once)) return { lines: [bySex(`${name} says: ${text(a.once.says) || ONCE_SAYS}`, p.sex)] };
  const need = a.needs;
  if (need?.kind === 'gold' && p.gold < (Number(need.value) || 0)) return { lines: [`${name} says: You don't have enough gold for that. It's ${Math.floor(Number(need.value))} gp.`] };
  if (need?.kind === 'item' && !holds({ kind: 'item', value: need.value }, p)) return { lines: [`${name} says: You'll need ${withA(text(need.value))} for that.`] };
  if (need?.kind === 'flag' && !holds({ kind: 'flag', value: need.value }, p)) return { lines: [`${name} says: You can't do that yet.`] };
  const lines = [];
  for (const e of a.effects ?? []) {
    const f = cleanFlag(e.flag).toLowerCase();
    const n = Math.floor(Number(e.amount) || 0);
    if (e.kind === 'flag' && f) { p.flags.add(f); lines.push(`(flag ${f} set)`); }
    if (e.kind === 'unflag' && f) { p.flags.delete(f); lines.push(`(flag ${f} cleared)`); }
    if (e.kind === 'give' && text(e.item)) { p.items.push(text(e.item)); lines.push(`(you get a ${text(e.item)})`); }
    if (e.kind === 'take' && text(e.item)) {
      const i = p.items.findIndex((x) => x.toLowerCase() === text(e.item).toLowerCase());
      if (i >= 0) p.items.splice(i, 1);
      lines.push(`(the ${text(e.item)} is taken)`);
    }
    if (e.kind === 'gold' && n > 0) { p.gold += n; lines.push(`(+${n} gold)`); }
    if (e.kind === 'takegold' && n > 0) { p.gold = Math.max(0, p.gold - n); lines.push(`(-${n} gold)`); }
    if (e.kind === 'exp' && n > 0) lines.push(`(+${n} experience)`);
    if (e.kind === 'rent') lines.push(e.what === 'info' ? '(says which house you rent)' : '(rents a house on Lantern Row)');
    if (e.kind === 'teleport') lines.push(`(sent to ${e.x}, ${e.y})`);
    if (e.kind === 'bind') lines.push(`(comes back to ${e.x}, ${e.y} after dying)`);
  }
  if (once) {
    p.flags.add(once);
    lines.push(Number(a.once.minutes) > 0 ? `(works again in ${Math.floor(Number(a.once.minutes))} minutes)` : '(only once)');
  }
  if (text(a.reply)) lines.unshift(bySex(spoken(name, a.replyVerb, text(a.reply)), p.sex));
  return { lines, next: a.next ?? null };
}
