import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { loadSite } from './site-harness.mjs';

function setup(t, options) {
  const site = loadSite(options);
  t.after(() => site.close());
  site.advance(4000);
  return site;
}

test('production entry has local assets, metadata, and all existing downloads', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /remoteandpartners.com/);
  assert.doesNotMatch(html, /data:font|data:image|fonts.googleapis|fonts.gstatic/);
  for (const file of readdirSync('public/DXF')) {
    assert.deepEqual(readFileSync('dist/DXF/' + file), readFileSync('public/DXF/' + file));
  }
  for (const [, path] of html.matchAll(/(?:src|href)="(\.\/assets\/[^"#]+)"/g)) {
    assert.ok(readFileSync('dist/' + path).length);
  }
});

test('city keeps four destinations, appearance, language and sound controls', t => {
  const s = setup(t);
  assert.equal(s.document.querySelectorAll('#islands > .isl').length, 14);
  assert.equal(s.document.querySelectorAll('#nav button').length, 4);
  assert.equal(s.document.documentElement.lang, 'en');
  for (const button of s.document.querySelectorAll('#looks button')) {
    s.click('#looks [data-look="' + button.dataset.look + '"]');
    assert.equal(s.document.documentElement.dataset.look, button.dataset.look);
  }
  s.click('#langBtn');
  assert.equal(s.document.documentElement.lang, 'es');
  assert.match(s.find('#nav').textContent, /SERVICIOS/);
  s.click('#sndBtn');
  assert.equal(s.find('#sndBtn').getAttribute('aria-pressed'), 'false');
  s.click('#sndBtn');
  assert.equal(s.find('#sndBtn').getAttribute('aria-pressed'), 'true');
});

test('all four sheets, cached revisits, plan flip, section and automation', t => {
  const s = setup(t);
  assert.equal(s.find('.proj-bim').childElementCount, 0);
  s.click('#nav .c-purple');
  s.click('#panel [data-lab="autocad"]');
  s.advance(2000);
  assert.equal(s.find('#lab').getAttribute('aria-hidden'), 'false');
  assert.ok(s.find('.isl.focus').classList.contains('flat'));
  const first = s.find('.proj-cut').firstElementChild;
  const sheets = new Set();
  for (let i = 0; i < 4; i++) {
    sheets.add(s.find('#labTitle').textContent);
    assert.ok(s.find('.plan-g').childElementCount > 1);
    s.key('ArrowRight');
  }
  assert.equal(sheets.size, 4);
  assert.equal(s.find('.proj-cut').firstElementChild, first);
  s.click('#labFlip');
  assert.ok(!s.find('.isl.focus').classList.contains('flat'));
  s.key('Enter', '.proj-cut .det-open');
  assert.match(s.find('#detail').textContent, /A-401/);
  s.key('Escape');
  s.key('Escape');
  assert.equal(s.find('#lab').getAttribute('aria-hidden'), 'true');
  s.click('#panel [data-lab="auto"]');
  assert.match(s.find('#detail').textContent, /AUT-01/);
});

test('BIM disciplines and documentation handoff retain their state', t => {
  const s = setup(t);
  s.click('#nav .c-purple');
  s.click('#panel [data-lab="revit"]');
  const model = s.find('.proj-bim').firstElementChild;
  assert.ok(model);
  for (const key of ['arc', 'str', 'mep']) {
    s.click('#labCtrl [data-k="' + key + '"]');
    assert.equal(s.find('#labCtrl [data-k="' + key + '"]').getAttribute('aria-pressed'), 'false');
    assert.ok(s.find('.proj-bim .lay-' + key).classList.contains('lay-off'));
  }
  assert.equal(s.find('.proj-bim').firstElementChild, model);
  s.click('#labDoc');
  s.advance(2000);
  assert.match(s.find('#labEyebrow').textContent, /AUTOCAD/);
  assert.ok(s.find('.isl.focus').classList.contains('flat'));
});

test('network portraits and keyboard navigation work in both languages', t => {
  const s = setup(t);
  s.click('#nav .c-orange');
  s.advance(3000);
  assert.match(s.find('#panel').textContent, /Agustín/);
  assert.match(s.find('.portrait').src, /assets\/agu-/);
  s.key('ArrowRight');
  assert.match(s.find('#panel').textContent, /Tomás/);
  s.key('ArrowRight');
  assert.match(s.find('.portrait').src, /assets\/ro-/);
  s.click('#langBtn');
  assert.equal(s.document.documentElement.lang, 'es');
  s.key('ArrowRight');
  assert.match(s.find('.portrait').src, /assets\/agu-/);
});

test('territory and typology build on demand and remain interactive on revisit', t => {
  const s = setup(t);
  assert.equal(s.find('#usmap').childElementCount, 0);
  assert.equal(s.find('#typo').childElementCount, 0);
  s.click('#nav .c-blue');
  s.advance(6000);
  const region = s.find('#usmap [data-s="TX"]');
  assert.equal(s.document.querySelectorAll('#usmap .st.on').length, 8);
  s.key('Enter', '#usmap [data-s="TX"]');
  assert.match(s.find('#panel').textContent, /TX/);
  s.click('#panel [data-m="typology"]');
  assert.equal(s.document.querySelectorAll('#typo .ty').length, 2);
  s.key(' ', '#typo [data-t="twh"]');
  assert.match(s.find('#panel').textContent, /TOWNHOUSE/);
  s.key('Escape'); s.advance(5000);
  s.click('#nav .c-blue'); s.advance(6000);
  s.click('#panel [data-m="territory"]');
  assert.equal(s.find('#usmap [data-s="TX"]'), region);
});

test('origin chapters build the city and restore it on exit', t => {
  const s = setup(t);
  s.click('#nav .c-magenta');
  s.advance(2500);
  for (let i = 0; i < 4; i++) { s.key('ArrowRight'); s.advance(2000); }
  assert.equal(s.document.querySelectorAll('#islands .built').length, 14);
  assert.equal(s.find('#oNext').disabled, true);
  s.key('Escape');
  assert.ok(!s.document.body.classList.contains('originmode'));
  s.click('#nav .c-purple'); s.advance(2000);
  assert.match(s.find('#panel').textContent, /AutoCAD/);
});

test('contact protocol and composed email preserve user input', t => {
  const s = setup(t, { reduced: true });
  s.click('#connect'); s.advance(4000);
  assert.ok(s.find('#panel').classList.contains('form'));
  s.find('#fName').value = 'Test & User';
  s.find('#fCompany').value = 'Architecture studio';
  s.find('#fName').dispatchEvent(new s.window.Event('input', { bubbles: true }));
  const href = decodeURIComponent(s.find('#fSend').href);
  assert.match(href, /^mailto:agustin@remoteandpartners.com/);
  assert.match(href, /Test & User/);
  assert.match(href, /Architecture studio/);
  s.key('Escape'); s.advance(3000);
  assert.equal(s.pendingFrames, 0);
});

test('motion sleeps while reading, hidden, or reduced; interaction wakes it', t => {
  const s = setup(t);
  s.click('#nav .c-purple'); s.advance(5000);
  assert.equal(s.pendingFrames, 0);
  s.resetWrites(); s.advance(2000);
  assert.equal(s.writes, 0);
  s.key('Escape'); s.advance(4000);
  assert.equal(s.pendingFrames, 1);
  s.setHidden(true);
  assert.equal(s.pendingFrames, 0);
  s.setHidden(false); s.advance(100);
  assert.equal(s.pendingFrames, 1);
  s.setReduced(true); s.advance(4000);
  assert.equal(s.pendingFrames, 0);
  s.resetWrites(); s.advance(2000);
  assert.equal(s.writes, 0);
  s.click('#nav .c-purple'); s.advance(3000);
  assert.ok(s.find('#panel').classList.contains('open'));
  s.setReduced(false); s.key('Escape'); s.advance(4000);
  assert.equal(s.pendingFrames, 1);
});

test('mobile viewport retains services, plans, territory and back navigation', t => {
  const s = setup(t, { width: 390, reduced: true });
  s.click('#nav .c-purple'); s.click('#panel [data-lab="autocad"]'); s.advance(2500);
  assert.ok(s.find('.isl.focus').classList.contains('flat'));
  s.key('Escape'); s.key('Escape');
  s.click('#nav .c-blue'); s.advance(6000);
  s.key('Escape'); s.advance(5000);
  assert.ok(!s.document.body.classList.contains('mapmode'));
});

test('a settled territory camera responds to viewport changes', t => {
  const s = setup(t, { reduced: true });
  s.click('#nav .c-blue'); s.advance(6000);
  const before = s.find('#world').getAttribute('transform');
  assert.equal(s.pendingFrames, 0);
  s.window.innerWidth = 390;
  s.window.dispatchEvent(new s.window.Event('resize'));
  s.advance(1000);
  assert.notEqual(s.find('#world').getAttribute('transform'), before);
});

test('decorative flight speed is independent of display refresh rate', t => {
  const a = setup(t), b = setup(t);
  a.advance(2000, 60); b.advance(2000, 120);
  const x = s => Number(s.find('#ships > g').getAttribute('transform').match(/translate\(([^,]+)/)[1]);
  // The final ambient sample can differ by one 30 Hz frame (under 1 unit).
  assert.ok(Math.abs(x(a) - x(b)) < 1);
});

test('standalone Artifact still runs with embedded fonts and portraits', t => {
  const html = readFileSync('ciudad.html', 'utf8');
  assert.doesNotMatch(html, /import\.meta|fonts.googleapis|fonts.gstatic|src="\/src\//);
  assert.match(html, /data:font\/woff2;base64/);
  const s = setup(t, { original: 'ciudad.html', reduced: true });
  s.click('#nav .c-orange'); s.advance(3000);
  assert.match(s.find('.portrait').src, /^data:image\/jpeg;base64,/);
  s.key('Escape');
});

for (const shot of ['city', 'plan', 'flat', 'bim', 'typo', 'map', 'rings']) {
  test('capture URL still completes: ' + shot, t => {
    const s = setup(t, { query: '?shot=' + shot });
    s.advance(6000);
    assert.ok(s.document.documentElement.classList.contains('shot-ready'));
    assert.equal(s.pendingFrames, 0);
  });
}
