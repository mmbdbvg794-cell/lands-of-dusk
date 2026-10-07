// Run with: node test/forum.test.mjs
import assert from 'node:assert/strict';
import { bbcode, pageList } from '../js/forum.js';

assert.equal(bbcode('[b]bold[/b] and [i]it[/i]'), '<b>bold</b> and <i>it</i>');
assert.equal(bbcode('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;', 'no HTML gets through');
assert.equal(bbcode('[url=javascript:alert(1)]x[/url]'), '[url=javascript:alert(1)]x[/url]', 'only http(s) links');
assert.equal(bbcode('[url]https://example.org/a[/url]'), '<a href="https://example.org/a" rel="nofollow noopener" target="_blank">https://example.org/a</a>');
assert.equal(bbcode('[url=https://x.org" onmouseover="a]y[/url]').includes('onmouseover="'), false, 'no attribute injection');
assert.equal(bbcode('[quote=flan]hi[/quote]'), '<blockquote><cite>flan wrote:</cite>hi</blockquote>');
assert.equal(bbcode('[quote=a][quote=b]in[/quote]out[/quote]'), '<blockquote><cite>a wrote:</cite><blockquote><cite>b wrote:</cite>in</blockquote>out</blockquote>', 'nested quotes');
assert.equal(bbcode('[code][b]raw[/b] <x>[/code]'), '<pre><code>[b]raw[/b] &lt;x&gt;</code></pre>', 'code is kept as it is');
assert.equal(bbcode('a\nb'), 'a<br>b');
assert.deepEqual(pageList(1, 1), [{ n: 1, current: true }]);
assert.deepEqual(pageList(5, 10).map((p) => (p.gap ? '…' : p.n)), [1, '…', 3, 4, 5, 6, 7, '…', 10]);
console.log('ok - forum');
