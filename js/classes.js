// A character's class (server/Classes.java). After logging in the client
// asks ("class"); "Class: unset..." asks for the choices ("class choices")
// and opens the picker, after the male/female one (the drow class's name
// follows it). The choice is sent as "class <id>". With a class, "class
// tiers" says what each trainable skill and spell group is for it: core,
// open, cross (another class's: dearer, and capped) or barred. No DOM;
// tested in node.

export const CLASS_ASK = 'class';
export const CLASS_CHOICES = 'class choices';
export const CLASS_TIERS = 'class tiers';
export const classCommand = (id) => `class ${String(id ?? '').replace(/[^a-z]/gi, '').toLowerCase()}`;

// "Class: <id>|<name>" -> { id, name }; "Class: unset..." -> 'unset'; else null.
export function parseClass(line) {
  const s = String(line ?? '').trim();
  if (/^Class: unset\b/.test(s)) return 'unset';
  const m = /^Class: ([a-z]+)\|(.+)$/.exec(s);
  return m ? { id: m[1], name: m[2].trim() } : null;
}

// "ClassChoices: id|name|blurb;..." -> [{ id, name, blurb }]; else null.
export function parseChoices(line) {
  const m = /^ClassChoices: (.*)$/.exec(String(line ?? '').trim());
  if (!m) return null;
  return m[1].split(';').map((p) => p.split('|')).filter((p) => p.length >= 2 && p[0])
    .map(([id, name, blurb = '']) => ({ id: id.trim(), name: name.trim(), blurb: blurb.trim() }));
}

// "ClassTiers: name=tier;..." -> Map(lower-case name -> tier); else null.
export function parseTiers(line) {
  const m = /^ClassTiers:(.*)$/.exec(String(line ?? '').trim());
  if (!m) return null;
  const out = new Map();
  for (const p of m[1].split(';')) {
    const i = p.lastIndexOf('=');
    if (i > 0) out.set(p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim());
  }
  return out;
}

// A skill or spell group's tag for the Skills tab and the Spellbook:
// { text, title, kind } or null (open ones, or not known).
export function tierTag(tiers, name) {
  const t = tiers?.get(String(name ?? '').trim().toLowerCase());
  if (t === 'core') return { kind: 'core', text: 'Core', title: 'Your class\'s own: the usual price at trainers' };
  if (t === 'cross') return { kind: 'cross', text: 'Other class', title: 'Another class\'s: dearer at trainers, and only so far' };
  if (t === 'barred') return { kind: 'barred', text: 'Not for you', title: 'Your class can\'t learn this' };
  return null;
}
