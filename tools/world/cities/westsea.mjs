// Westsea Harbour: the old world's port, on its western sea north of the
// refugee ship, reached by a forest trail from the road south of the
// great walled city. Built by tools/world/city.mjs (with --old-world:
// the only plan that touches the old world, and only over forest, grass
// and open sea).
//
// The trail was found by searching from where players can already walk:
// it clears only trees, keeps 3 squares from anything built, and touches
// no ground players couldn't already reach (so it opens no hidden place).
// It also writes the ferry network's "ferries" file and routes (see
// ferry.mjs).

import { ferryFiles, captain, clearMooring, clearOldDeck } from './ferry.mjs';

const O = [85, 210];
const TRAIL = [[106, 214], [106, 302], [101, 302], [101, 326], [95, 326], [95, 355]];

export default {
  name: 'Westsea Harbour',
  origin: O,
  size: [25, 153],
  seed: 31,
  oldWorld: true,
  // Forest, grass and the sea; nothing else.
  mayBuild: (t) => [64, 103, 25, 26, 36, 1, 65].includes(t),
  build(p) {
    const at = (x, y) => [x - O[0], y - O[1]]; // map -> plan coordinates
    for (const [path, text] of Object.entries(ferryFiles())) p.file(path, text);

    // The trail, and a clearing where it meets the sea.
    p.path(TRAIL.map(([x, y]) => at(x, y)));
    for (let y = 352; y <= 354; y++) for (let x = 93; x <= 97; x++) if (!(x === 95)) p.set(...at(x, y), ',');
    for (const x of [94, 96, 97]) p.set(...at(x, 355), ',');
    // The pier, three planks wide; the ferry docks beside it.
    p.fill(...at(94, 356), 3, 6, '=');
    clearMooring(p, 'westsea');
    p.npc({ name: 'Captain Hale', look: 'Villager Man', desc: 'Captain Hale, salt in his beard and a pipe in his teeth.', ...xy(at(95, 361)), dlg: captain('westsea', 'Ships to the new lands! Aelindor Landing and Eastreach!') });
    p.sign('Westsea Harbour', 'Westsea Harbour. Ships sail from here to the lands across the sea.', ...at(93, 354));
    p.sign('To Westsea Harbour', 'South through the forest to Westsea Harbour.', ...at(105, 214));
    p.set(...at(105, 214), ',');
    clearOldDeck(p);
  },
};

function xy([x, y]) { return { x, y }; }
