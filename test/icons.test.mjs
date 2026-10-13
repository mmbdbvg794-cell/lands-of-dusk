// Run with: node test/icons.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAB_ICONS, CLASS_ICONS } from '../js/icons.js';

// Every character tab in the page has an icon.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const panel = html.slice(html.indexOf('aria-label="Character"'), html.indexOf('</div>', html.indexOf('aria-label="Character"')));
for (const [, tab] of panel.matchAll(/data-tab="([a-z]+)"/g)) assert.ok(TAB_ICONS[tab], `no icon for the ${tab} tab`);
// Every class in the server's defaults has one.
const java = readFileSync(new URL('../server/Classes.java', import.meta.url), 'utf8');
for (const [, id] of java.matchAll(/"class ([a-z]+) /g)) assert.ok(CLASS_ICONS[id], `no icon for ${id}`);
// Only plain shapes, nothing that runs.
for (const inner of [...Object.values(TAB_ICONS), ...Object.values(CLASS_ICONS)]) {
  assert.ok(/^(<(path|rect|circle|ellipse)( [a-z-]+="[-0-9a-zA-Z. ]*")+\/>)+$/.test(inner), inner);
}
console.log('icons tests passed');
