// Recognising your own death in the server's text, for the death screen.
// No DOM; tested in node.
//
// Battle.class, when you die: "\tYou have died.", then (if the server
// takes any) "You have lost <n>gp" and "You have lost <n>exp". Then the
// server's conf/onDeath script moves you to your bind point with a little
// HP; nothing needs sending back.

export function isDeath(text) {
  return /^You have died\.?$/i.test(text.trim());
}

// { gold } or { exp } for a loss line, or null.
export function parseLoss(text) {
  const m = text.trim().match(/^You have lost (\d+)\s*(gp|exp)\.?$/i);
  if (!m) return null;
  return m[2].toLowerCase() === 'gp' ? { gold: Number(m[1]) } : { exp: Number(m[1]) };
}

// "You lost 120 gold and 3,400 experience." from what's arrived so far.
export function lossSentence({ gold = 0, exp = 0 } = {}) {
  const parts = [];
  if (gold > 0) parts.push(`${gold.toLocaleString('en')} gold`);
  if (exp > 0) parts.push(`${exp.toLocaleString('en')} experience`);
  return parts.length ? `You lost ${parts.join(' and ')}.` : '';
}
