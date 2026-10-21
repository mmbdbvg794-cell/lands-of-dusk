// The quest wizard (God tab → Quests…): a quest kept as one record, and
// everything it becomes: stages in each NPC's conversation (tagged with
// the quest, so saving again replaces them), journal lines, and the kill
// goals the server counts (server/Quests.java). No DOM; tested in node.
//
// A quest is
//   { id, title, giver,                       the NPC who offers it
//     offer: { says, accept, acceptReply, decline, declineReply },
//     reminder,                                what the giver says meanwhile
//     steps: [ { kind: 'talk', npc, says, answer, reply, journal }
//            | { kind: 'bring', npc, item, take, says, answer, reply, journal }
//            | { kind: 'kill', mob, count, what, journal }
//            | { kind: 'place', x, y, radius, what, arrive, journal } ],
//     reward: { gold, exp, items: [name], says },
//     after,                                   the giver once it's done
//     repeatable,
//     again: { minutes, flag, says },          a repeatable one: it can be
//                                              taken once per `minutes`
//                                              (0: any time); `flag` (default
//                                              <id>_again) remembers it, and
//                                              quests sharing a flag share
//                                              the wait (a bounty board's
//                                              posters); `says` is said
//                                              to anyone who must wait
//     requires, notYet,                        another quest to finish first
//                                              (its id), and what the giver
//                                              says until then (optional)
//     depth }                                  how many quests come before it
//                                              in its chain (questDepth)
// Flags: <id>_on while it's running, <id>_1 ... <id>_n for each step,
// <id>_done when it's finished (not kept for a repeatable quest).

import { cleanFlag, toBase64, fromBase64, TIMER_FLAG } from './dialogue.js';

export const cleanQuestId = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);

export const newQuest = (id = '') => ({
  id: cleanQuestId(id),
  title: '',
  giver: '',
  offer: { says: '', accept: 'I will help', acceptReply: '', decline: 'Not now', declineReply: 'Another time, then.' },
  reminder: 'How goes it? Your Journal has what\'s next.',
  steps: [],
  reward: { gold: 0, exp: 0, items: [], says: '' },
  after: 'Thank you again for your help.',
  repeatable: false,
  again: { minutes: 0, flag: '', says: '' },
  requires: '',
  notYet: '',
  depth: 0,
});

export const newStep = (kind, giver = '') => {
  if (kind === 'kill') return { kind, mob: '', count: 5, what: '', journal: '' };
  if (kind === 'place') return { kind, x: '', y: '', radius: 3, what: '', arrive: '', journal: '' };
  if (kind === 'bring') return { kind, npc: giver, item: '', take: true, says: '', answer: 'Here it is', reply: '', journal: '' };
  return { kind: 'talk', npc: giver, says: '', answer: 'OK', reply: '', journal: '' };
};

const flagOn = (q) => `${q.id}_on`;
const flagStep = (q, i) => `${q.id}_${i + 1}`;
const flagDone = (q) => `${q.id}_done`;
// A repeatable quest's wait between takings: its flag, or '' for none.
const againMinutes = (q) => (q.repeatable ? Math.max(0, Math.floor(Number(q.again?.minutes) || 0)) : 0);
export const flagAgain = (q) => (againMinutes(q) ? cleanFlag(q.again?.flag || '') || `${q.id}_again` : '');
const t = (s) => String(s ?? '').trim();
const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
const hasNum = (v) => v !== '' && v != null && Number.isFinite(Number(v));
// Steps done by the server rather than in a conversation.
const byServer = (s) => s.kind === 'kill' || s.kind === 'place';
export const RADIUS_MAX = 20;
const radius = (s) => Math.min(RADIUS_MAX, n(s.radius));

// Every flag the quest uses (the server's "quest who" looks for these).
export function questFlags(q) {
  const out = [flagOn(q), ...q.steps.map((_, i) => flagStep(q, i)), flagDone(q)];
  if (flagAgain(q)) out.push(flagAgain(q), TIMER_FLAG);
  return out;
}

// What's wrong with it, as sentences; empty when it can be saved.
export function questProblems(q) {
  const out = [];
  if (!q.id) out.push('Give the quest a short name (letters, numbers and _).');
  if (!t(q.title)) out.push('Give it a title: it heads the Journal.');
  if (!t(q.giver)) out.push('Say who gives the quest.');
  if (!t(q.offer.says)) out.push('Say what the giver asks.');
  if (!q.steps.length) out.push('Add at least one step.');
  q.steps.forEach((s, i) => {
    const at = `Step ${i + 1}`;
    if (s.kind === 'kill') {
      if (!t(s.mob)) out.push(`${at}: which monster?`);
      if (n(s.count) < 1) out.push(`${at}: how many?`);
    } else if (s.kind === 'place') {
      if (!hasNum(s.x) || !hasNum(s.y) || Number(s.x) < 0 || Number(s.y) < 0) out.push(`${at}: where? (x and y)`);
      if (!t(s.what)) out.push(`${at}: name the place (e.g. the old watchtower).`);
    } else {
      if (!t(s.npc)) out.push(`${at}: who do they go to?`);
      if (s.kind === 'bring' && !t(s.item)) out.push(`${at}: which item?`);
    }
    if (!t(s.journal)) out.push(`${at}: write its Journal line (what the player should do).`);
  });
  if (q.steps.length && byServer(q.steps.at(-1))) out.push(`The last step has to be someone to talk to or bring something to (that's where the reward is given): add one after the ${q.steps.at(-1).kind === 'kill' ? 'killing' : 'journey'}.`);
  if (q.requires && cleanQuestId(q.requires) === q.id) out.push('A quest can\'t need itself to be finished first.');
  return out;
}

// The journal lines: one per step, and the finished line.
export function questJournal(q) {
  const out = q.steps.map((s, i) => ({ flag: flagStep(q, i), title: t(q.title), text: t(s.journal), done: false }));
  out.push({ flag: flagDone(q), title: t(q.title), text: t(q.reward.says) || 'Done.', done: true });
  return out;
}

// The server's kill goals: "flag|monster|count|next flag|what they are".
export function killsFile(q) {
  return q.steps.map((s, i) => (s.kind === 'kill'
    ? `${flagStep(q, i)}|${t(s.mob)}|${Math.max(1, n(s.count))}|${i + 1 < q.steps.length ? flagStep(q, i + 1) : ''}|${(t(s.what) || `${t(s.mob)} slain`).replace(/\|/g, '/')}\n`
    : '')).join('');
}

// The server's places: "flag|x|y|radius|next flag|said on arriving".
export function placesFile(q) {
  return q.steps.map((s, i) => (s.kind === 'place'
    ? `${flagStep(q, i)}|${n(s.x)}|${n(s.y)}|${radius(s)}|${i + 1 < q.steps.length ? flagStep(q, i + 1) : ''}|${(t(s.arrive) || `You have reached ${t(s.what)}.`).replace(/[|\r\n]+/g, ' ')}\n`
    : '')).join('');
}

// Effects that move a player from step i to the next (or finish).
function advance(q, i) {
  const out = [{ kind: 'unflag', flag: flagStep(q, i) }];
  if (i + 1 < q.steps.length) {
    out.push({ kind: 'flag', flag: flagStep(q, i + 1) });
    return out;
  }
  out.push({ kind: 'unflag', flag: flagOn(q) });
  if (!q.repeatable) out.push({ kind: 'flag', flag: flagDone(q) });
  if (n(q.reward.gold)) out.push({ kind: 'gold', amount: n(q.reward.gold) });
  if (n(q.reward.exp)) out.push({ kind: 'exp', amount: n(q.reward.exp) });
  for (const item of q.reward.items ?? []) if (t(item)) out.push({ kind: 'give', item: t(item) });
  // Flags the quest sets when it's done, besides its own (a tale learnt).
  for (const f of Array.isArray(q.reward.flags) ? q.reward.flags : []) if (cleanFlag(f)) out.push({ kind: 'flag', flag: cleanFlag(f) });
  return out;
}

// "a leather cap", "an iron sword", "leather gloves" (a pair or a set).
// (A name takes none: "Dawnbreaker", "Elowen's letter".)
export const withArticle = (item) => (/s$/i.test(item) || /^[A-Z]/.test(item) ? item : /^[aeiou]/i.test(item) ? `an ${item}` : `a ${item}`);

// What the reward is, said after the last step ("You get 50 gold, ...").
export function rewardLine(q) {
  const parts = [];
  for (const item of q.reward.items ?? []) if (t(item)) parts.push(withArticle(t(item)));
  if (n(q.reward.gold)) parts.push(`${n(q.reward.gold)} gold`);
  if (n(q.reward.exp)) parts.push(`${n(q.reward.exp)} experience`);
  if (!parts.length) return '';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return `You receive ${list}.`;
}

const same = (a, b) => t(a).toLowerCase() === t(b).toLowerCase();

// The quest's stages for one NPC, tagged { quest: id }, in the order
// they're checked: finished, its steps here, still running, the offer.
export function questStagesFor(q, npc) {
  const req = cleanQuestId(q.requires);
  const tag = req ? { quest: q.id, requires: req, depth: Math.max(1, n(q.depth)) } : { quest: q.id };
  const stages = [];
  const isGiver = same(npc, q.giver);
  if (isGiver && !q.repeatable) stages.push({ ...tag, when: { kind: 'flag', value: flagDone(q) }, says: t(q.after) || 'Thank you again.', answers: [] });
  q.steps.forEach((s, i) => {
    if (byServer(s) || !same(s.npc, npc)) return;
    const last = i + 1 === q.steps.length;
    const reply = [t(s.reply), last ? t(q.reward.says) : ''].filter(Boolean).join(' ');
    const answer = { label: t(s.answer) || (s.kind === 'bring' ? 'Here it is' : 'OK'), reply, effects: [] };
    if (s.kind === 'bring') {
      answer.needs = { kind: 'item', value: t(s.item) };
      if (s.take) answer.effects.push({ kind: 'take', item: t(s.item) });
    }
    answer.effects.push(...advance(q, i));
    if (last && rewardLine(q)) answer.next = { verb: 'acts', says: rewardLine(q), answers: [] };
    stages.push({ ...tag, when: { kind: 'flag', value: flagStep(q, i) }, says: t(s.says) || (s.kind === 'bring' ? `Have you brought the ${t(s.item)}?` : '...'), answers: [answer] });
  });
  if (isGiver) {
    stages.push({ ...tag, when: { kind: 'flag', value: flagOn(q) }, says: t(q.reminder) || 'How goes it?', answers: [] });
    // Still waiting (a repeatable one's "again" flag, which quests can
    // share, like a bounty board's three notices): said straight away,
    // rather than offered and then refused once it's accepted.
    if (flagAgain(q)) stages.push({ ...tag, wait: true, when: { kind: 'flag', value: flagAgain(q) }, says: t(q.again.says) || 'Come back later; there\'s nothing new yet.', answers: [] });
    // (offer.effects: anything more that happens on taking it, as a
    // dialogue answer's effects: a boatman rowing you off, say.)
    const accept = { label: t(q.offer.accept) || 'I will help', reply: t(q.offer.acceptReply), effects: [{ kind: 'flag', flag: flagOn(q) }, { kind: 'flag', flag: flagStep(q, 0) }, ...(Array.isArray(q.offer.effects) ? q.offer.effects : [])] };
    // Once per wait (the conversation's "again after N minutes").
    if (flagAgain(q)) accept.once = { flag: flagAgain(q), minutes: againMinutes(q), says: t(q.again.says) || 'Come back later; there\'s nothing new yet.' };
    const answers = [accept];
    if (t(q.offer.decline)) answers.push({ label: t(q.offer.decline), reply: t(q.offer.declineReply), effects: [] });
    // Offered to anyone who hasn't finished it (a repeatable one: anyone
    // not on it now, as the stage before catches those who are).
    const offer = { ...tag, when: { kind: 'noflag', value: q.repeatable ? flagOn(q) : flagDone(q) }, says: t(q.offer.says), answers };
    const req = cleanQuestId(q.requires);
    if (req) offer.also = { kind: 'flag', value: `${req}_done` };
    stages.push(offer);
    // Not ready for it yet: said instead, or (left empty) they talk as usual.
    if (req && t(q.notYet)) stages.push({ ...tag, when: { kind: 'noflag', value: `${req}_done` }, says: t(q.notYet), answers: [] });
  }
  return stages;
}

// How many quests come before this one in its chain: one more than the
// quest it needs (given by the id: the depth that one was saved with).
export function questDepth(q, depthOf) {
  const req = cleanQuestId(q.requires);
  return req ? 1 + n(depthOf(req)) : 0;
}

// The NPCs a quest talks through.
export function questNpcs(q) {
  const out = [];
  for (const name of [q.giver, ...q.steps.filter((s) => !byServer(s)).map((s) => s.npc)]) {
    if (t(name) && !out.some((o) => same(o, name))) out.push(t(name));
  }
  return out;
}

// A dialogue without this quest's stages. A stage marked keep stays: one
// added by hand in a quest's place (what an NPC says once a later quest is
// done, tagged with that quest so it sorts with the thank-yous), which the
// quest itself doesn't make.
export function stripQuest(dlg, id) {
  return { ...dlg, stages: (dlg.stages ?? []).filter((s) => s.quest !== id || s.keep) };
}

// Where a quest stage goes among all the quests an NPC has, as the first
// stage that fits is the one used: someone's step first (whatever quest it
// is), then "still running", the offers (each after its wait, if it has
// one), "not yet", and the thank-yous
// last, so finishing one quest doesn't hide the next one's offer. Among
// the thank-yous, a quest that needs another goes first: the latest quest
// of a chain gets the last word.
function stageRank(st) {
  // A repeatable quest's wait goes with the offers, just before its own.
  if (st.wait) return 2;
  const id = st.quest, w = st.when ?? {};
  const v = cleanFlag(w.value).toLowerCase();
  if (w.kind === 'flag') return v === `${id}_done` ? 4 : v === `${id}_on` ? 1 : 0;
  if (w.kind === 'noflag') return v === `${id}_done` || v === `${id}_on` ? 2 : 3;
  return 2;
}

// A dialogue with this quest's stages for `npc` put in among any other
// quests' (stageRank), before the NPC's own. A dialogue with only its
// quest stages still ends with something to say.
export function mergeQuest(dlg, q, npc) {
  const rest = stripQuest(dlg, q.id).stages;
  const others = rest.filter((s) => s.quest);
  const own = rest.filter((s) => !s.quest);
  const mine = questStagesFor(q, npc);
  const all = [...others, ...mine];
  const needs = new Map(all.map((st) => [st.quest, st.requires]));
  const depth = (id, seen = new Set()) => (needs.get(id) && !seen.has(id) ? 1 + depth(needs.get(id), seen.add(id)) : 0);
  // The depth the quest was saved with, or what this NPC's quests show.
  // Offers too: the one furthest along a chain first (it only shows once
  // the quest before it is done, so it doesn't hide a newcomer's first
  // quest; and a newcomer's first quest mustn't hide it).
  const key = (st) => (stageRank(st) === 4 || stageRank(st) === 2 ? -Math.max(n(st.depth), depth(st.quest)) : 0);
  const quests = all.map((st, i) => [stageRank(st), key(st), i, st]).sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]).map((x) => x[3]);
  // An NPC with a conversation of their own (a last "always" stage with
  // answers: Old Wenna's tales, say) keeps it reachable: a quest's offer,
  // reminder and thank-you also offer its answers, after their own. Built
  // again from each stage's own words (base) every time, so nothing doubles.
  const home = [...own].reverse().find((st) => st.when?.kind === 'always' && (st.answers ?? []).some((a) => t(a.label)));
  for (const st of quests) {
    st.base ??= { says: st.says, answers: st.answers ?? [] };
    st.says = st.base.says;
    st.answers = [...st.base.answers];
    const rank = stageRank(st);
    if (!home || !(rank === 1 || rank === 2 || rank === 4)) continue;
    if (rank === 1 && !(st.when?.kind === 'flag' && cleanFlag(st.when.value).toLowerCase() === `${st.quest}_on`)) continue;
    const labels = new Set(st.answers.map((a) => t(a.label).toLowerCase()));
    if (!st.answers.length) st.says = [t(st.base.says), t(home.says)].filter(Boolean).join(' ');
    st.answers.push(...structuredClone(home.answers.filter((a) => t(a.label) && !labels.has(t(a.label).toLowerCase()))));
  }
  // A thank-you sits behind the offers, so in a chain it was never heard:
  // the next quest's offer starts with it instead (it shows from the
  // moment the quest before is done). And once the chain is over, the
  // last thank-you takes turns with the NPC's own greeting, which every
  // quest stage hid (an NPC whose own conversation has answers already
  // gets them above). Only a greeting that's spoken: one that acts out a
  // scene (Elowen in chains) may no longer be true by then.
  const thanks = new Map(quests.filter((st) => stageRank(st) === 4).map((st) => [st.quest, st]));
  const last = [...own].reverse().find((st) => st.when?.kind === 'always');
  const greeting = home || !last || (last.verb && last.verb !== 'says') ? '' : t(last.says);
  for (const st of quests) {
    delete st.lines;
    const rank = stageRank(st);
    const before = thanks.get(st.requires);
    if (rank === 2 && !st.wait && st.when?.kind === 'noflag' && before) st.says = [t(before.base.says), t(st.says)].filter(Boolean).join(' ');
    if (rank === 4 && greeting && ![...thanks.values()].some((o) => o.requires === st.quest)) st.lines = [greeting];
  }
  const stages = [...quests, ...own];
  if (!own.length) stages.push({ when: { kind: 'always', value: '' }, says: '', answers: [] });
  return { ...dlg, stages };
}

// ---- talking to the server ----

export const QUEST_LIST = 'quest list';
export const questGet = (id) => `quest get ${id}`;
export const questRemove = (id) => `quest remove ${id}`;
export const questWho = (id) => `quest who ${id}`;
export function questSave(q) {
  const def = { ...q, flags: questFlags(q) };
  return `quest set ${q.id}|${toBase64(JSON.stringify(def))}|${toBase64(killsFile(q))}|${toBase64(placesFile(q))}`;
}

// A line from the server -> { list: { id, title } } | { listDone } |
// { def: quest } | { saved: id } | { removed: id } | { who: { id, name,
// flag, online } } | { whoDone } | null.
export function parseQuestReply(line) {
  const s = line.trim();
  let m;
  if (s === 'Quest: done') return { listDone: true };
  if ((m = /^Quest: ([a-z0-9_]+)\|(.*)$/.exec(s))) return { list: { id: m[1], title: m[2] } };
  if ((m = /^QuestDef: ([a-z0-9_]+)\|([A-Za-z0-9+/=]*)$/.exec(s))) {
    try {
      return { def: tidyQuest(JSON.parse(fromBase64(m[2]))) };
    } catch {
      return null;
    }
  }
  if ((m = /^QuestSaved: ([a-z0-9_]+)$/.exec(s))) return { saved: m[1] };
  if ((m = /^QuestRemoved: ([a-z0-9_]+)$/.exec(s))) return { removed: m[1] };
  if (s === 'QuestWho: done') return { whoDone: true };
  if ((m = /^QuestWho: ([a-z0-9_]+)\|([^|]+)\|([^|]+)\|([01])$/.exec(s))) return { who: { id: m[1], name: m[2], flag: m[3], online: m[4] === '1' } };
  return null;
}

// Fills in what a saved quest left out.
export function tidyQuest(raw) {
  const q = { ...newQuest(), ...(raw ?? {}) };
  q.id = cleanQuestId(q.id);
  q.offer = { ...newQuest().offer, ...(raw?.offer ?? {}) };
  q.reward = { ...newQuest().reward, ...(raw?.reward ?? {}) };
  q.again = { ...newQuest().again, ...(raw?.again ?? {}) };
  q.requires = cleanQuestId(q.requires);
  q.depth = n(q.depth);
  q.reward.items = Array.isArray(q.reward.items) ? q.reward.items : [];
  q.steps = Array.isArray(q.steps) ? q.steps.map((s) => ({ ...newStep(s?.kind, q.giver), ...s })) : [];
  delete q.flags;
  return q;
}

// Which step a quest flag is, for people ("Step 2: Talk to the Old Hunter").
export function describeFlag(q, flag) {
  const f = flag.replace(/ \(.*\)$/, '');
  const prog = /\((.*)\)$/.exec(flag)?.[1];
  if (same(f, flagOn(q))) return null; // always beside a step
  if (same(f, flagDone(q))) return 'Finished';
  const i = q.steps.findIndex((_, k) => same(f, flagStep(q, k)));
  if (i < 0) return f;
  const s = q.steps[i];
  const what = s.kind === 'kill' ? `kill ${n(s.count)} ${t(s.mob)}${prog ? ` (${prog})` : ''}` : s.kind === 'place' ? `go to ${t(s.what)} (${n(s.x)}, ${n(s.y)})` : s.kind === 'bring' ? `bring ${t(s.item)} to ${t(s.npc)}` : `talk to ${t(s.npc)}`;
  return `Step ${i + 1}: ${what}`;
}

export { cleanFlag };
