// Merchants: what they sell (opcode 17) and what you could sell them
// (opcode 22). No DOM; tested in node.
//
// The server (DuskEngine.refreshEntities, LivingThing.updateSell) sends
// one line per item, "<cost>gp)<name>", or "<cost>exp)<skill>" for
// training, which costs experience. The Java client cut everything up to
// the ")" and sent "buy <quantity> <name>" / "sell <quantity> <name>".

export function parseWare(line) {
  const m = line.match(/^\(?\s*(-?\d+)\s*(gp|exp)\)\s*(.+)$/i);
  if (!m) {
    const name = line.slice(line.indexOf(')') + 1).trim();
    return name ? { name, price: null, currency: 'gp' } : null;
  }
  return { name: m[3].trim(), price: Number(m[1]), currency: m[2].toLowerCase() };
}

// A list of lines as parsed items, without repeats (the server can send
// a merchant's wares more than once while you stand there).
export function parseWares(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const w = parseWare(line);
    if (!w) continue;
    const key = `${w.currency}:${w.price}:${w.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

// How a ware reads in the Shop: training ("train:double attack") as the
// skill or stat's name ("Double Attack").
export function wareLabel(name) {
  const m = /^train:\s*(.+)$/i.exec(name);
  return m ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()) : name;
}

export function buyCommand(name, qty = 1) {
  return `buy ${clampQty(qty)} ${name}`;
}

export function sellCommand(name, qty = 1) {
  return `sell ${clampQty(qty)} ${name}`;
}

function clampQty(qty) {
  const n = Math.floor(Number(qty));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 999) : 1;
}
