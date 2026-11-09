/* Flashcards with Leitner-style spaced repetition. Progress lives in this browser (localStorage). */
(function () {
  var D = window.DCS, esc = D.esc;
  var KEY = 'dc:cards:v1';
  var DAY = 86400000;
  var INTERVALS = [0, 0, 1, 3, 7, 21]; // days until due, by box reached (0 = new, 1 = just failed)
  var MAX_BOX = 5;

  var UI = {
    es: {
      title: 'Tarjetas de estudio', sub: 'Repetición espaciada: las que fallas vuelven antes; las que dominas, más tarde.',
      domain: 'Tema', status: 'Mostrar', all: 'Todos los temas',
      due: 'Para repasar hoy', fresh: 'Nuevas', failed: 'Falladas', mastered: 'Dominadas', starred: 'Marcadas ⭐', every: 'Todas',
      total: 'Total', learning: 'En aprendizaje', flip: 'Pulsa para ver la respuesta', front: 'Pregunta', back: 'Respuesta',
      ko: '❌ No la sabía', ok: '✅ La sabía', star: '⭐ Marcar', unstar: '⭐ Quitar marca',
      left: 'quedan', doneTitle: '🎉 ¡Sesión completada!', doneText: 'No quedan tarjetas en este filtro.', again: 'Volver a empezar',
      empty: 'No hay tarjetas con este filtro.', keys: 'Atajos: Espacio = girar · 1 = no la sabía · 2 = la sabía · S = marcar',
      manage: '🗂️ Organizar mis tarjetas', box: 'Caja', card: 'Tarjeta', topic: 'Tema', reset: 'Reiniciar', resetAll: 'Reiniciar todo el progreso',
      confirmReset: '¿Borrar todo el progreso de las tarjetas en este navegador?', export: '⬇️ Exportar progreso', import: '⬆️ Importar progreso',
      importOk: 'Progreso importado.', importBad: 'El fichero no es válido.',
      storeNote: 'El progreso se guarda solo en este navegador (no hay cuenta ni servidor). Si cambias de navegador u ordenador, exporta aquí e importa allí.',
      boxNames: ['Nueva', '1 · Fallada', '2 · Aprendiendo', '3 · Aprendiendo', '4 · Dominada', '5 · Muy dominada'],
      seen: 'vista', nextIn: 'próxima'
    },
    en: {
      title: 'Study flashcards', sub: 'Spaced repetition: the ones you miss come back sooner; the ones you master, later.',
      domain: 'Topic', status: 'Show', all: 'All topics',
      due: 'Due today', fresh: 'New', failed: 'Missed', mastered: 'Mastered', starred: 'Starred ⭐', every: 'All',
      total: 'Total', learning: 'Learning', flip: 'Click to see the answer', front: 'Question', back: 'Answer',
      ko: "❌ Didn't know it", ok: '✅ Knew it', star: '⭐ Star', unstar: '⭐ Unstar',
      left: 'left', doneTitle: '🎉 Session complete!', doneText: 'No cards left in this filter.', again: 'Start again',
      empty: 'No cards match this filter.', keys: 'Shortcuts: Space = flip · 1 = didn\'t know · 2 = knew · S = star',
      manage: '🗂️ Organize my cards', box: 'Box', card: 'Card', topic: 'Topic', reset: 'Reset', resetAll: 'Reset all progress',
      confirmReset: 'Delete all flashcard progress in this browser?', export: '⬇️ Export progress', import: '⬆️ Import progress',
      importOk: 'Progress imported.', importBad: 'The file is not valid.',
      storeNote: 'Progress is saved only in this browser (no account or server). If you switch browser or computer, export here and import there.',
      boxNames: ['New', '1 · Missed', '2 · Learning', '3 · Learning', '4 · Mastered', '5 · Well mastered'],
      seen: 'seen', nextIn: 'next'
    }
  };
  function u(k) { return UI[D.lang()][k]; }

  var cards = window.DC_CARDS.map(function (c) { c.id = D.hash(c.f[1]); return c; });
  var progress = D.load(KEY, {});
  var filter = { d: 'all', s: 'due' };
  var queue = [], flipped = false, sessionDone = 0;

  function rec(id) { return progress[id] || null; }
  function save() { D.save(KEY, progress); }
  function status(c) {
    var r = rec(c.id);
    if (!r || !r.b) { return 'fresh'; }
    if (r.lw) { return 'failed'; }
    if (r.b >= 4) { return 'mastered'; }
    return 'learning';
  }
  function isDue(c) { var r = rec(c.id); return !r || !r.b || (r.due || 0) <= Date.now(); }
  function matches(c, s) {
    if (filter.d !== 'all' && c.d !== filter.d) { return false; }
    var st = status(c), r = rec(c.id);
    switch (s || filter.s) {
      case 'due': return isDue(c);
      case 'fresh': return st === 'fresh';
      case 'failed': return st === 'failed';
      case 'mastered': return st === 'mastered';
      case 'starred': return !!(r && r.s);
      default: return true;
    }
  }
  function buildQueue() {
    var list = cards.filter(function (c) { return matches(c); });
    var failed = D.shuffle(list.filter(function (c) { return status(c) === 'failed'; }));
    var rest = D.shuffle(list.filter(function (c) { return status(c) !== 'failed'; }));
    queue = failed.concat(rest).map(function (c) { return c.id; });
    flipped = false; sessionDone = 0;
  }
  function byId(id) { for (var i = 0; i < cards.length; i++) { if (cards[i].id === id) { return cards[i]; } } return null; }

  function answer(ok) {
    var id = queue[0]; if (!id) { return; }
    var r = progress[id] || { b: 0, ok: 0, ko: 0, s: 0 };
    if (ok) { r.b = Math.min(MAX_BOX, (r.b || 0) + 1); r.ok++; r.lw = 0; r.due = Date.now() + INTERVALS[r.b] * DAY; }
    else { r.b = 1; r.ko++; r.lw = 1; r.due = Date.now(); }
    r.last = Date.now();
    progress[id] = r; save();
    queue.shift(); flipped = false;
    if (ok) { sessionDone++; } else { queue.splice(Math.min(queue.length, 3), 0, id); } // the missed card returns in a few cards
    render();
  }
  function toggleStar(id) {
    var r = progress[id] || { b: 0, ok: 0, ko: 0, s: 0 };
    r.s = r.s ? 0 : 1; progress[id] = r; save(); render();
  }

  /* ───── rendering ───── */
  function chips() {
    var h = '<button type="button" class="st-chip' + (filter.d === 'all' ? ' on' : '') + '" data-d="all">' + esc(u('all')) + '</button>';
    D.DOMAINS.forEach(function (d) { h += '<button type="button" class="st-chip' + (filter.d === d.k ? ' on' : '') + '" data-d="' + d.k + '">' + esc(D.tx(d.n)) + '</button>'; });
    return h;
  }
  function stats() {
    var inDom = cards.filter(function (c) { return filter.d === 'all' || c.d === filter.d; });
    var n = { fresh: 0, learning: 0, failed: 0, mastered: 0 };
    inDom.forEach(function (c) { n[status(c)]++; });
    var pct = inDom.length ? Math.round(100 * n.mastered / inDom.length) : 0;
    return '<div class="st-stats"><span><b>' + inDom.length + '</b> ' + esc(u('total')) + '</span><span><b>' + n.fresh + '</b> ' + esc(u('fresh')) + '</span><span><b>' + n.learning + '</b> ' + esc(u('learning')) + '</span><span class="bad"><b>' + n.failed + '</b> ' + esc(u('failed')) + '</span><span class="good"><b>' + n.mastered + '</b> ' + esc(u('mastered')) + '</span></div><div class="st-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>';
  }
  function cardArea() {
    if (!queue.length) {
      var anyMatch = cards.some(function (c) { return matches(c); });
      return '<div class="st-card st-empty"><h3>' + esc(sessionDone ? u('doneTitle') : u('empty')) + '</h3><p>' + esc(sessionDone ? u('doneText') : '') + '</p>' + (anyMatch || sessionDone ? '<button type="button" class="st-btn" data-act="restart">' + esc(u('again')) + '</button>' : '') + '</div>';
    }
    var c = byId(queue[0]), r = rec(c.id), starred = !!(r && r.s);
    var h = '<div class="st-meta"><span class="badge badge-blue">' + esc(D.domainName(c.d)) + '</span><span class="st-left">' + queue.length + ' ' + esc(u('left')) + '</span></div>';
    h += '<div class="st-card' + (flipped ? ' flipped' : '') + '" data-act="flip" tabindex="0" role="button" aria-label="' + esc(u('flip')) + '">';
    h += '<small>' + esc(flipped ? u('back') : u('front')) + '</small>';
    h += '<div class="st-text">' + esc(D.tx(flipped ? c.b : c.f)) + '</div>';
    h += flipped ? '' : '<em>' + esc(u('flip')) + '</em>';
    h += '</div>';
    h += '<div class="st-actions">';
    if (flipped) { h += '<button type="button" class="st-btn ko" data-act="ko">' + esc(u('ko')) + '</button><button type="button" class="st-btn ok" data-act="ok">' + esc(u('ok')) + '</button>'; }
    else { h += '<button type="button" class="st-btn" data-act="flip">' + esc(u('flip')) + '</button>'; }
    h += '<button type="button" class="st-btn ghost" data-act="star">' + esc(starred ? u('unstar') : u('star')) + '</button></div>';
    h += '<p class="st-keys">' + esc(u('keys')) + '</p>';
    return h;
  }
  function manage() {
    var rows = cards.filter(function (c) { return filter.d === 'all' || c.d === filter.d; });
    var h = '<table class="st-table"><tr><th>' + esc(u('card')) + '</th><th>' + esc(u('topic')) + '</th><th>' + esc(u('box')) + '</th><th>⭐</th><th></th></tr>';
    rows.forEach(function (c) {
      var r = rec(c.id) || { b: 0 };
      var opts = '';
      for (var b = 0; b <= MAX_BOX; b++) { opts += '<option value="' + b + '"' + (b === (r.b || 0) ? ' selected' : '') + '>' + esc(u('boxNames')[b]) + '</option>'; }
      h += '<tr><td>' + esc(D.tx(c.f)) + '</td><td>' + esc(D.domainName(c.d)) + '</td><td><select data-box="' + c.id + '">' + opts + '</select></td><td><input type="checkbox" data-star="' + c.id + '"' + (r.s ? ' checked' : '') + '></td><td><button type="button" class="st-mini" data-reset="' + c.id + '">' + esc(u('reset')) + '</button></td></tr>';
    });
    return h + '</table>';
  }
  var manageOpen = false;
  function render() {
    var root = document.getElementById('app');
    var statusOpts = ['due', 'fresh', 'failed', 'mastered', 'starred', 'every'].map(function (k) { return '<option value="' + k + '"' + (filter.s === k ? ' selected' : '') + '>' + esc(u(k)) + '</option>'; }).join('');
    root.innerHTML =
      '<div class="st-filters"><div class="st-chips">' + chips() + '</div>' +
      '<label class="st-sel">' + esc(u('status')) + ' <select id="fstatus">' + statusOpts + '</select></label></div>' +
      stats() +
      '<div class="st-stage">' + cardArea() + '</div>' +
      '<details class="st-manage"' + (manageOpen ? ' open' : '') + '><summary>' + esc(u('manage')) + '</summary>' +
      '<div class="st-tools"><button type="button" class="st-btn ghost" data-act="export">' + esc(u('export')) + '</button> <label class="st-btn ghost">' + esc(u('import')) + '<input type="file" id="fimport" accept="application/json" hidden></label> <button type="button" class="st-btn ghost" data-act="resetall">' + esc(u('resetAll')) + '</button></div>' +
      '<p class="st-note">' + esc(u('storeNote')) + '</p>' + manage() + '</details>';
    var lb = document.getElementById('lang'); if (lb) { lb.textContent = D.lang() === 'es' ? '🌐 English' : '🌐 Español'; }
    document.getElementById('ttl').textContent = u('title'); document.getElementById('sub').textContent = u('sub');
    document.title = u('title') + ' — Data Cloud Hub';
  }

  /* ───── events ───── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-d],[data-reset]'); if (!t) { return; }
    if (t.dataset.d) { filter.d = t.dataset.d; buildQueue(); render(); return; }
    if (t.dataset.reset) { delete progress[t.dataset.reset]; save(); buildQueue(); render(); return; }
    var a = t.dataset.act;
    if (a === 'flip') { flipped = !flipped; render(); }
    else if (a === 'ok') { answer(true); }
    else if (a === 'ko') { answer(false); }
    else if (a === 'star') { toggleStar(queue[0]); }
    else if (a === 'restart') { buildQueue(); render(); }
    else if (a === 'resetall') { if (confirm(u('confirmReset'))) { progress = {}; save(); buildQueue(); render(); } }
    else if (a === 'export') {
      var blob = new Blob([JSON.stringify({ v: 1, progress: progress }, null, 1)], { type: 'application/json' });
      var l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'datacloud-tarjetas-progreso.json'; l.click(); setTimeout(function () { URL.revokeObjectURL(l.href); }, 1000);
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'fstatus') { filter.s = t.value; buildQueue(); render(); }
    else if (t.dataset && t.dataset.box !== undefined) {
      var id = t.dataset.box, b = parseInt(t.value, 10), r = progress[id] || { b: 0, ok: 0, ko: 0, s: 0 };
      r.b = b; r.lw = 0; r.due = b ? Date.now() + INTERVALS[b] * DAY : 0; progress[id] = r; save(); manageOpen = true; buildQueue(); render();
    } else if (t.dataset && t.dataset.star !== undefined) {
      var id2 = t.dataset.star, r2 = progress[id2] || { b: 0, ok: 0, ko: 0, s: 0 };
      r2.s = t.checked ? 1 : 0; progress[id2] = r2; save(); manageOpen = true; render();
    } else if (t.id === 'fimport' && t.files && t.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { var o = JSON.parse(fr.result); if (!o || typeof o.progress !== 'object') { throw 0; } progress = o.progress; save(); buildQueue(); render(); alert(u('importOk')); }
        catch (x) { alert(u('importBad')); }
      };
      fr.readAsText(t.files[0]);
    }
  });
  document.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('st-manage')) { manageOpen = e.target.open; } }, true);
  document.addEventListener('keydown', function (e) {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { return; }
    if (!queue.length) { return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipped = !flipped; render(); }
    else if (flipped && (e.key === '1' || e.key === 'ArrowLeft')) { answer(false); }
    else if (flipped && (e.key === '2' || e.key === 'ArrowRight')) { answer(true); }
    else if (e.key === 's' || e.key === 'S') { toggleStar(queue[0]); }
  });
  document.getElementById('lang').addEventListener('click', function () { D.setLang(D.lang() === 'es' ? 'en' : 'es'); render(); });

  buildQueue(); render();
})();
