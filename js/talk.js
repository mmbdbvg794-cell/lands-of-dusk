// Talking to NPCs (the server's Talk class): reading what they say, and
// the commands. No DOM; tested in node.
//
// NPCs speak in chat lines like
//   Drill Sergeant says: Hey you! Training or the world? (training/world)
//   Drill Sergeant shouts: You there! Come talk to me!
// A "(a/b/...)" at the end is the answers the NPC's script is waiting
// for; the client shows them as buttons (typing one works too).
// "talk names" answers "Talkers: <name>, <name>, ..." with every NPC that
// has something to say.

export const talkCommand = (id) => `talk ${id}`;
export const TALKERS = 'talk names';

const SPEECH = /^(.{1,40}?) (says|shouts|asks|whispers|acts): (.+)$/;
const CHOICES = /\s*\(([^()]+(?:\/[^()]+)+)\)\s*$/;
// One answer on its own, as the dialogue editor writes it: lower case, at
// the very end of the line ("Want to hear a story? (sure)").
const ONE_CHOICE = /\s*\(([a-z0-9',.?! -]{1,30})\)$/;

// { who, verb, text, choices } for an NPC's line, or null.
export function parseSpeech(line) {
  const m = SPEECH.exec(line.trim());
  if (!m) return null;
  let text = m[3];
  let choices = [];
  const c = CHOICES.exec(text) ?? ONE_CHOICE.exec(text);
  if (c) {
    choices = c[1].split('/').map((s) => s.trim()).filter(Boolean);
    text = text.slice(0, c.index).trim();
  }
  return { who: m[1], verb: m[2], text, choices };
}

// The names in a "Talkers:" reply (lower case), or null for other lines.
export function parseTalkers(line) {
  const m = /^Talkers:\s*(.*)$/.exec(line.trim());
  if (!m) return null;
  return new Set(m[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}
