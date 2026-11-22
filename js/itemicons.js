// Item icons rendered from handmade CC0 models (art/icons/<file>.png, 128x128, listed in
// art/icons/icons.json as { "item name": "file.png" }). Where an item has one it's the item's
// picture everywhere the Painted pictures were used: the Backpack, Storage and Shop lists (in
// either art style), the worn-gear cards, and items on the ground in the Painted style. Items
// without one keep their old painted picture (art/painted/items.png); the Pixel style's ground
// sprites never change.
//
// Names match as the old pictures do: any case, and an underscored twin (silver_belt) finds
// the spaced name (silver belt) and the other way round.

export const ICON_DIR = 'art/icons/';
export const ICON_SIZE = 128;

// icons.json as a Map of lower-case name -> file.
export function iconMap(json) {
  const m = new Map();
  for (const [k, v] of Object.entries(json ?? {})) if (typeof v === 'string') m.set(k.toLowerCase().trim(), v);
  return m;
}

// The icon's file for an item name, or null.
export function iconFile(icons, name) {
  if (!icons?.size || !name) return null;
  const n = String(name).toLowerCase().trim();
  return icons.get(n) ?? icons.get(n.replace(/_/g, ' ')) ?? icons.get(n.replace(/ /g, '_')) ?? null;
}

// Which picture an item gets: { icon: 'art/icons/<file>' }, { frame } on the old painted
// sheet (art: { index: Map }), or null for neither.
export function itemPicture(name, icons, art) {
  const file = iconFile(icons, name);
  if (file) return { icon: ICON_DIR + file };
  const frame = art?.index?.get(String(name ?? '').toLowerCase());
  return frame === undefined ? null : { frame };
}

// The icons, each image fetched the first time it's wanted and kept. `load(url)` gives a
// one-frame sheet (js/sprites.js loadSheet) or null; `onLoad()` runs when one arrives, so the
// map and panels can draw it.
export class ItemIcons {
  constructor(icons, { load, onLoad = () => {} } = {}) {
    this.icons = icons ?? new Map();
    this.load = load;
    this.onLoad = onLoad;
    this.sheets = new Map(); // file -> sheet, null (failed) or a promise
  }

  file(name) { return iconFile(this.icons, name); }
  url(name) { const f = this.file(name); return f ? ICON_DIR + f : null; }

  // The loaded sheet (one frame) for an item's icon, or undefined while it loads (or with no
  // icon: then `file` is null). A failed load gives null.
  sheet(name) {
    const f = this.file(name);
    if (!f) return undefined;
    const s = this.sheets.get(f);
    if (s === undefined && this.load) {
      const p = Promise.resolve(this.load(ICON_DIR + f, ICON_SIZE)).catch(() => null).then((sheet) => {
        this.sheets.set(f, sheet ?? null);
        this.onLoad();
      });
      this.sheets.set(f, p);
      return undefined;
    }
    return s instanceof Promise ? undefined : s;
  }
}
