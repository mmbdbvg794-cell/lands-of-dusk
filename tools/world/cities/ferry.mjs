// The ferry network: its ports, the ship at sea that passengers ride on,
// and each port's captain. A captain takes the 50 gp fare, sets the
// hidden flag voyage_<port> and puts you on the deck; server/Ferry.java
// does the rest (a line from the crew, and 20 seconds later the pier).
// Used by the plans that build the ports (westsea.mjs, eastreach.mjs,
// aelindor.mjs); westsea.mjs writes the server's "ferries" file and the
// ship.

export const FARE = 50;

export const PORTS = {
  westsea: { x: 95, y: 357, name: 'Westsea Harbour' },
  landing: { x: 444, y: 1184, name: 'Aelindor Landing' },
  eastreach: { x: 1691, y: 1303, name: 'Eastreach' },
};

// The ship out at sea (open water all round): its 6 x 3 squares, and
// where passengers stand on its deck.
export const DECK = { x0: 1262, y0: 1094, x1: 1267, y1: 1096, board: [1264, 1095] };

// The ship's tiles, a row at a time (the moored ships at the piers too).
export const SHIP_ROWS = [[131, 132, 133, 134, 135, 136], [137, 138, 139, 140, 141, 142], [143, 144, 145, 146, 147, 148]];

export function ferriesFile() {
  const lines = ['# Ferry ports and the ship at sea (server/Ferry.java), made by tools/world/cities/ferry.mjs.'];
  for (const [key, p] of Object.entries(PORTS)) lines.push(`port ${key} ${p.x} ${p.y} ${p.name}`);
  lines.push(`deck ${DECK.x0} ${DECK.y0} ${DECK.x1} ${DECK.y1}`);
  return lines.join('\n') + '\n';
}

// A captain at `here`: a button for every other port.
export function captain(here, shout) {
  const others = Object.entries(PORTS).filter(([k]) => k !== here);
  return {
    shouts: [shout],
    stages: [{
      when: { kind: 'always', value: '' },
      says: `Where are you bound? Passage is ${FARE} gold, and we sail as soon as you're aboard.`,
      answers: [
        ...others.map(([key, p]) => ({
          label: p.name,
          reply: `${p.name} it is. Welcome aboard!`,
          needs: { kind: 'gold', value: String(FARE) },
          effects: [
            { kind: 'takegold', amount: FARE },
            ...Object.keys(PORTS).filter((k) => k !== key).map((k) => ({ kind: 'unflag', flag: `voyage_${k}` })),
            { kind: 'flag', flag: `voyage_${key}` },
            { kind: 'teleport', x: DECK.board[0], y: DECK.board[1] },
          ],
        })),
        { label: 'Not today', reply: 'The sea will wait.', effects: [] },
      ],
    }],
  };
}

// The ship moored by a pier, from its top-left square (plan coordinates).
export function mooredShip(p, x, y) {
  SHIP_ROWS.forEach((row, j) => row.forEach((t, i) => p.tileNumber(x + i, y + j, t)));
}
