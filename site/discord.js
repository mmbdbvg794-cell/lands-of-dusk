// The Discord invite on the website: every <a data-discord> gets the
// DISCORD_URL from beta.conf on duskserver (apply.py's /play/apply/api/info),
// and its [data-discord-item] container is shown. With no invite set, or
// when that can't be reached, they stay hidden.
(async () => {
  try {
    const res = await fetch('/play/apply/api/info', { cache: 'no-store', credentials: 'omit' });
    const { discord } = await res.json();
    if (!/^https:\/\//.test(discord || '')) return;
    for (const a of document.querySelectorAll('a[data-discord]')) {
      a.href = discord;
      a.target = '_blank';
      a.rel = 'noopener';
      a.closest('[data-discord-item]')?.removeAttribute('hidden');
    }
  } catch (err) { /* no invite shown */ }
})();
