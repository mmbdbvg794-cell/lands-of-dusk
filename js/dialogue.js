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
// (carries it) | 'gold' (has at least that much). Effects: { kind:
// 'give'|'take', item }, { kind: 'gold'|'takegold'|'exp', amount }, { kind:
// 'flag'|'unflag', flag }, { kind: 'teleport', x, y }. An answer can also
// have needs: { kind: 'gold'|'item'|'flag', value } (said to be missing
// otherwise) and next: a follow-up question { says, answers } of its own.
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

function condition(when) {
  const v = when?.value;
  switch (when?.kind) {
    case 'flag': return cleanFlag(v) && `hasCondition trigger ${cleanFlag(v)}`;
    case 'noflag': return cleanFlag(v) && `! hasCondition trigger ${cleanFlag(v)}`;
    case 'item': return text(v) && `hasItem trigger "${text(v)}"`;
    case 'gold': return Number(v) > 0 && `! < trigger cash ${Math.floor(Number(v))}`;
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
    case 'teleport': return Number.isFinite(Number(e.x)) && Number.isFinite(Number(e.y)) && e.x !== '' && e.y !== '' ? `${pad}set trigger locxy ${Math.floor(Number(e.x))} ${Math.floor(Number(e.y))}` : null;
    // Where they come back to after dying. The script language's own "set
    // trigger bindlocx" stores 0 on this server, so the server sets it
    // (server/Skills.java): bindnow lets the order through, once.
    case 'bind': return Number.isFinite(Number(e.x)) && Number.isFinite(Number(e.y)) && e.x !== '' && e.y !== '' ? `${pad}addCondition trigger bindnow\n${pad}order trigger "bindat ${Math.floor(Number(e.x))} ${Math.floor(Number(e.y))}"` : null;
    default: return null;
  }
}

// What an answer needs before it works (answer.needs): the check, and
// what the NPC says when it isn't met.
function needs(n, who) {
  const v = n?.value;
  switch (n?.kind) {
    case 'gold': return Number(v) > 0 ? [`< trigger cash ${Math.floor(Number(v))}`, `${who} says: You don't have enough gold for that. It's ${Math.floor(Number(v))} gp.`] : null;
    case 'item': return text(v) ? [`! hasItem trigger "${text(v)}"`, `${who} says: You'll need a ${text(v)} for that.`] : null;
    case 'flag': return cleanFlag(v) ? [`! hasCondition trigger ${cleanFlag(v)}`, `${who} says: You can't do that yet.`] : null;
    default: return null;
  }
}

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
  const answers = (node.answers ?? []).filter((a) => cleanLabel(a.label));
  const choices = answers.length ? ` (${answers.map((a) => cleanLabel(a.label)).join('/')})` : '';
  if (text(node.says) || choices) out.push(`${pad}chat trigger "${spoken(who, node.verb, text(node.says) + choices)}"`);
  if (!answers.length) return;
  const v = depth ? `answer${depth + 1}` : 'answer';
  out.push(`${pad}input trigger ${v}`);
  for (const a of answers) {
    out.push(`${pad}if strequals ${v} "${cleanLabel(a.label)}"`);
    const need = needs(a.needs, who);
    if (need) out.push(`${pad}\tif ${need[0]}`, `${pad}\t\tchat trigger "${need[1]}"`, `${pad}\t\tendscript`, `${pad}\tend`);
    for (const e of a.effects ?? []) {
      const line = effect(e, pad + '\t');
      if (line) out.push(line);
    }
    if (text(a.reply)) out.push(`${pad}\tchat trigger "${spoken(who, a.replyVerb, text(a.reply))}"`);
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
    const cond = condition(stage.when);
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

// The .greet file: one shout per line.
export const toGreet = (dlg) => (dlg.shouts ?? []).map(text).filter(Boolean).join('\n');

// Every flag the dialogue uses, so the server can make their files.
export function flagsOf(dlg) {
  const flags = new Set();
  const walk = (node) => {
    for (const a of node.answers ?? []) {
      for (const e of a.effects ?? []) if (e.kind === 'flag' || e.kind === 'unflag') flags.add(cleanFlag(e.flag));
      if (a.needs?.kind === 'flag') flags.add(cleanFlag(a.needs.value));
      if (a.next) walk(a.next);
    }
  };
  for (const stage of dlg.stages ?? []) {
    if (stage.when?.kind === 'flag' || stage.when?.kind === 'noflag') flags.add(cleanFlag(stage.when.value));
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
    const cond = condition(r.when);
    const pad = cond ? '\t' : '';
    if (cond) out.push(`if ${cond}`);
    for (const e of r.effects ?? []) {
      const line = effect(e, pad);
      if (line) out.push(line);
    }
    if (text(r.says)) out.push(`${pad}chat trigger "${tileLine(r)}"`);
    out.push(`${pad}endscript`);
    if (cond) out.push('end');
    else break; // an "always" rule: nothing after it is reached
  }
  out.push('endscript');
  return out.join('\n') + '\n';
}

// Who can step onto the square (walk): { kind: 'everyone'|'flag'|'noflag'
// |'race'|'norace'|'nobody', flag, speaker, says } -> the server's can-move expression
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
    case 'nobody': return 'false';
    default: return '';
  }
}
export const blockedText = (walk) => (text(walk?.says) ? tileLine(walk) : '');
// A tile's message: from a speaker (said, shouted... or an action), or just
// the words when no one says it.
export function tileLine(r) {
  return text(r.speaker) ? spoken(text(r.speaker), r.verb, text(r.says)) : text(r.says);
}

export function tileFlagsOf(rules, walk) {
  const flags = new Set(flagsOf({ stages: (rules ?? []).map((r) => ({ when: r.when, answers: [{ label: 'x', effects: r.effects }] })) }));
  if ((walk?.kind === 'flag' || walk?.kind === 'noflag') && cleanFlag(walk.flag)) flags.add(cleanFlag(walk.flag));
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
