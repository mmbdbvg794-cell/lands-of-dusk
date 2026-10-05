// The ferry network (server/Ferry.java): ports with their piers and
// docks, the routes between docks (tools/world/routes, made by
// tools/world/sea-route.mjs), and the ships that sail them on a timetable.
// A port's captain sells a ticket (the 50 gp fare and the hidden flag
// voyage_<port>); the ship takes ticket holders aboard when she's in, and
// they ride her across the sea. westsea.mjs writes the server's "ferries"
// file and the routes; the ports' plans place the captains.

import { readFileSync } from 'node:fs';

export const FARE = 50;

// pier: the square passengers step down onto; berths: where the ship to
// and from each other port waits, its centre and which way it faces
// (degrees, 0 east, 90 south), one each side of the pier.
export const PORTS = {
  westsea: { name: 'Westsea Harbour', pier: [95, 357], berths: { landing: [100, 360, 0], eastreach: [90, 360, 180] } },
  landing: { name: 'Aelindor Landing', pier: [444, 1184], berths: { westsea: [444, 1178, 0], eastreach: [444, 1173, 0] } },
  eastreach: { name: 'Eastreach', pier: [1691, 1303], berths: { landing: [1694, 1300, 0], westsea: [1695, 1306, 0] } },
};

// One ship per route, back and forth; each route's squares are in
// tools/world/routes/<a>-<b>.txt (made by tools/world/sea-route.mjs from
// berth to berth).
export const ROUTES = [['westsea', 'landing'], ['landing', 'eastreach'], ['eastreach', 'westsea']];
export const SHIPS = [
  { name: 'Seahawk', calls: ['westsea', 'landing'] },
  { name: 'Morning Star', calls: ['landing', 'eastreach'] },
  { name: 'Grey Gull', calls: ['eastreach', 'westsea'] },
];

const routeFile = (a, b) => `ferryroutes/${a}-${b}`;

// The server's "ferries" file and the route files it names.
export function ferryFiles() {
  const lines = ['# Ferries (server/Ferry.java), made by tools/world/cities/ferry.mjs.'];
  for (const [key, p] of Object.entries(PORTS)) {
    lines.push(`port ${key} ${p.pier[0]} ${p.pier[1]} ${p.name}`);
    for (const [other, b] of Object.entries(p.berths)) lines.push(`dock ${key} ${b.join(' ')} ${other}`);
  }
  const files = {};
  for (const [a, b] of ROUTES) {
    lines.push(`route ${a} ${b} ${routeFile(a, b)}`);
    files[routeFile(a, b)] = readFileSync(new URL(`../routes/${a}-${b}.txt`, import.meta.url), 'utf8');
  }
  for (const s of SHIPS) lines.push(`ship ${s.name.replace(/ /g, '_')} ${s.calls.join(' ')}`);
  files.ferries = lines.join('\n') + '\n';
  return files;
}

// A captain at `here`: a ticket to each port a ship from here calls at.
export function captain(here, shout) {
  const dests = new Map(); // port -> ship name
  for (const s of SHIPS) if (s.calls.includes(here)) for (const k of s.calls) if (k !== here && !dests.has(k)) dests.set(k, s.name);
  if (!dests.size) return { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'No ships call here yet. Come back another day.', answers: [] }] };
  return {
    shouts: [shout],
    stages: [{
      when: { kind: 'always', value: '' },
      says: `Where are you bound? A ticket is ${FARE} gold. Then wait here on the pier, and you'll be taken aboard when the ship is in.`,
      answers: [
        ...[...dests].map(([key, ship]) => ({
          label: PORTS[key].name,
          reply: `A ticket for ${PORTS[key].name}. Wait here on the pier: the ${ship} will take you aboard when she's in.`,
          needs: { kind: 'gold', value: String(FARE) },
          effects: [
            { kind: 'takegold', amount: FARE },
            ...Object.keys(PORTS).filter((k) => k !== key).map((k) => ({ kind: 'unflag', flag: `voyage_${k}` })),
            { kind: 'flag', flag: `voyage_${key}` },
          ],
        })),
        { label: 'Not today', reply: 'The sea will wait.', effects: [] },
      ],
    }],
  };
}

// Where the old standing ships were moored: water again (the ferries are
// drawn by the client now). [x0, y0, water tile]
export const OLD_MOORINGS = { westsea: [97, 359, 65], landing: [439, 1176, 0], eastreach: [1691, 1298, 0] };
export function clearMooring(p, key) {
  const [x0, y0, water] = OLD_MOORINGS[key];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) p.farTile(x0 + i, y0 + j, water);
}
// The first ferries' ship at sea (passengers waited on it): gone too.
export function clearOldDeck(p) {
  for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) p.farTile(1262 + i, 1094 + j, 0);
}
