// Line icons, drawn here (no image files): the character panel's tabs, and
// the class picker's classes. Each is the inside of a 24x24 SVG drawn with
// currentColor, so they take the text colour. No DOM except svg(); the
// path data is checked in node (test/icons.test.mjs).

export const TAB_ICONS = {
  // Backpack: a bag with a flap and straps.
  inv: '<path d="M8 7V5.5a4 4 0 0 1 8 0V7"/><rect x="4.5" y="7" width="15" height="13.5" rx="3"/><path d="M4.5 12h15M10 12v2.5h4V12"/>',
  // Equipped: a breastplate.
  equip: '<path d="M8 3.5 4 6v5l3 1.5V20h10v-7.5l3-1.5V6l-4-2.5"/><path d="M8 3.5c1 2 2.3 3 4 3s3-1 4-3"/><path d="M12 6.5V20"/>',
  // Spellbook: an open book.
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13.5C7 18 10 18.5 12 20c2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z"/><path d="M12 6.5V20"/>',
  // Shop: a pile of coins.
  shop: '<ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5S14.5 12.4 14.5 11V7"/><path d="M9.5 15.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4c0-1.4-2.5-2.5-5.5-2.5"/><path d="M9.5 15.5v3.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-3.5"/>',
  // Storage: a chest.
  store: '<path d="M3.5 10a5 5 0 0 1 5-5h7a5 5 0 0 1 5 5"/><rect x="3.5" y="10" width="17" height="9.5" rx="1"/><path d="M3.5 13h17"/><rect x="10.5" y="11.5" width="3" height="3.5" rx=".5"/>',
  // Skills: rising bars.
  stats: '<path d="M4 20.5h16"/><rect x="5" y="13" width="3.5" height="7.5"/><rect x="10.25" y="8.5" width="3.5" height="12"/><rect x="15.5" y="4" width="3.5" height="16.5"/>',
  // Journal: a scroll.
  journal: '<path d="M7 4.5h11a2 2 0 0 1 0 4h-1.5V18a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 0 2.5-2.5V6.5"/><path d="M7 4.5a2 2 0 0 0-2 2v1.5h2.5"/><path d="M10 9.5h4M10 13h4M10 16.5h3"/>',
  // Friends: two people.
  friends: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="16.5" cy="7" r="2.6"/><path d="M15.5 13.2c3 .1 5.5 2.3 5.5 5.8"/>',
  // Mail: an envelope.
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  // Trade: two arrows passing.
  trade: '<path d="M4 8.5h14l-3.5-3.5M20 15.5H6l3.5 3.5"/>',
  // God: a crown.
  god: '<path d="M3.5 18.5h17l1-11-5.5 4.5L12 5l-4 7-5.5-4.5Z"/><path d="M3.5 21h17"/>',
};

export const CLASS_ICONS = {
  // Fighter: a double-bitted battle axe.
  fighter: '<g transform="rotate(35 12 12)"><path d="M12 2.5v19.5"/><path d="M12.6 6.2c2.4-1 4.9-2.2 6.6-3.4 1.4 4.2 1.4 8.6 0 12.8-1.7-1.2-4.2-2.4-6.6-3.4Z" fill="currentColor" fill-opacity=".25"/><path d="M11.4 6.2c-2.4-1-4.9-2.2-6.6-3.4-1.4 4.2-1.4 8.6 0 12.8 1.7-1.2 4.2-2.4 6.6-3.4Z" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="22" r=".8"/></g>',
  // Mage: a staff with a star.
  mage: '<path d="M8 21 15.5 9"/><path d="m17 2.5 1.2 2.8 3 .3-2.3 2 .7 3-2.6-1.6-2.6 1.6.7-3-2.3-2 3-.3Z"/>',
  // Cleric: a sun, the Light.
  cleric: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  // Priest or Priestess: the Spider Queen's spider.
  priest: '<ellipse cx="12" cy="14" rx="3" ry="4"/><circle cx="12" cy="8.3" r="1.9"/><path d="M9.3 11.5 5 8.5 3.5 4M9 13.5 3.5 12.5 2 15M9.2 15.5 5 18.5 4 21.5M14.7 11.5 19 8.5 20.5 4M15 13.5l5.5-1 1.5 2.5M14.8 15.5l4.2 3 1 3"/>',
  // Ranger: a drawn bow, the arrow pointing up and away.
  ranger: '<path d="M5 7.5Q19.5 4.5 16.5 19"/><path d="M5 7.5 16.5 19" stroke-width="1"/><path d="M4.5 19.5 20 4"/><path d="M21 3l-4.6 1.5 3.1 3.1Z" fill="currentColor"/><path d="M4.5 19.5h-2M4.5 19.5v2M6.5 17.5h-2.2M6.5 17.5v2.2"/>',
  // Paladin: a shield with a cross.
  paladin: '<path d="M12 2.8 4.5 5.5v6c0 4.7 3.2 8 7.5 9.7 4.3-1.7 7.5-5 7.5-9.7v-6Z"/><path d="M12 7v10M8.5 10.5h7"/>',
};

// An SVG element for an icon's inside (for the DOM).
export function svg(inner, size = 24) {
  const ns = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(ns, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', size > 30 ? '1.4' : '1.7');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = inner;
  return el;
}

// The character panel's tabs as icons: the words stay for screen readers
// and as the tooltip; a count (backpack, friends, mail) rides on the icon.
export function iconTabs(tablist) {
  for (const tab of tablist.querySelectorAll('[role="tab"][data-tab]')) {
    const inner = TAB_ICONS[tab.dataset.tab];
    if (!inner || tab.querySelector('svg')) continue;
    const count = tab.querySelector('.count');
    const label = [...tab.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    tab.replaceChildren(svg(inner, 22), Object.assign(document.createElement('span'), { className: 'tab-label', textContent: label }), ...(count ? [count] : []));
    tab.title = label;
    tab.classList.add('icon-tab');
  }
}
