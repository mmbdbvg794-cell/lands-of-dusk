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

// A flag name the server can keep as a condition file.
export const cleanFlag = (s) => String(s ?? '').trim().replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40);

// Text inside a script string: the script language has no escapes.
const text = (s) => String(s ?? '').replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim();
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

// A question: what's said, then its answers (each of which can ask a
// follow-up question), at depth `depth` (0 for a stage's own question).
function question(out, who, node, pad, depth) {
  const answers = (node.answers ?? []).filter((a) => cleanLabel(a.label));
  const choices = answers.length ? ` (${answers.map((a) => cleanLabel(a.label)).join('/')})` : '';
  if (text(node.says) || choices) out.push(`${pad}chat trigger "${who} says: ${text(node.says)}${choices}"`);
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
    if (text(a.reply)) out.push(`${pad}\tchat trigger "${who} says: ${text(a.reply)}"`);
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
  for (const stage of dlg.stages ?? []) {
    const cond = condition(stage.when);
    const pad = cond ? '\t' : '';
    if (cond) out.push(`if ${cond}`);
    question(out, who, stage, pad, 0);
    out.push(`${pad}endscript`);
    if (cond) out.push('end');
    else break; // an "always" stage: nothing after it is reached
  }
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
