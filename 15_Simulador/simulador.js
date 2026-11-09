/* Exam simulator: 10 random questions per attempt from the bilingual bank, weighted by exam domain. */
(function () {
  var D = window.DCS, esc = D.esc;
  var QKEY = 'dc:q:v1', HKEY = 'dc:exam:history:v1', PREF = 'dc:exam:prefs:v1';
  var N = 10, PASS = 70;

  var UI = {
    es: {
      title: 'Simulador de examen', sub: '10 preguntas al azar de un banco bilingüe, con el reparto por dominios del examen oficial.',
      start: 'Empezar examen', info: 'El examen real: 60 preguntas de opción múltiple, 105 minutos, 70 % para aprobar. Aquí: 10 preguntas por intento.',
      language: 'Idioma de las preguntas', immediate: 'Corrección inmediata (modo estudio)', prioritize: 'Dar prioridad a las que fallé o aún no he visto',
      bank: 'preguntas en el banco', hist: 'Tus últimos intentos', noHist: 'Aún no has hecho ningún intento.',
      q: 'Pregunta', of: 'de', prev: '← Anterior', next: 'Siguiente →', finish: 'Finalizar', check: 'Corregir', time: 'Tiempo',
      unanswered: 'Tienes preguntas sin contestar. ¿Finalizar de todos modos?',
      result: 'Resultado', passed: '✅ Aprobado', failed: '❌ No aprobado', needs: 'Se necesita un 70 %',
      byDomain: 'Por dominio', review: 'Revisión', yours: 'Tu respuesta', correct: 'Respuesta correcta', none: '(sin responder)',
      again: 'Nuevo examen', retry: 'Repetir solo las falladas', home: 'Volver al inicio', right: 'Correcta', wrong: 'Incorrecta',
      exp: 'Explicación', exit: 'Abandonar', confirmExit: '¿Abandonar el examen? Se perderá el intento.', attempts: 'intentos', score: 'Aciertos', clear: 'Borrar historial',
      confirmClear: '¿Borrar el historial y las estadísticas de preguntas en este navegador?'
    },
    en: {
      title: 'Exam simulator', sub: '10 random questions from a bilingual bank, weighted by the official exam domains.',
      start: 'Start exam', info: 'The real exam: 60 multiple-choice questions, 105 minutes, 70% to pass. Here: 10 questions per attempt.',
      language: 'Question language', immediate: 'Instant feedback (study mode)', prioritize: "Prioritize questions I missed or haven't seen yet",
      bank: 'questions in the bank', hist: 'Your latest attempts', noHist: "You haven't taken any attempt yet.",
      q: 'Question', of: 'of', prev: '← Previous', next: 'Next →', finish: 'Finish', check: 'Check', time: 'Time',
      unanswered: 'Some questions are unanswered. Finish anyway?',
      result: 'Result', passed: '✅ Passed', failed: '❌ Not passed', needs: '70% is needed',
      byDomain: 'By domain', review: 'Review', yours: 'Your answer', correct: 'Correct answer', none: '(unanswered)',
      again: 'New exam', retry: 'Retry only the missed ones', home: 'Back to start', right: 'Correct', wrong: 'Incorrect',
      exp: 'Explanation', exit: 'Quit', confirmExit: 'Quit the exam? The attempt will be lost.', attempts: 'attempts', score: 'Score', clear: 'Clear history',
      confirmClear: 'Clear the history and question statistics in this browser?'
    }
  };
  function u(k) { return UI[D.lang()][k]; }

  var bank = window.DC_QUESTIONS.map(function (q) { q.id = D.hash(q.q[1]); return q; });
  var qstats = D.load(QKEY, {});
  var history = D.load(HKEY, []);
  var prefs = D.load(PREF, { immediate: false, prioritize: true });
  var exam = null; // { items:[{q, order:[...], pick:null|idx}], i, t0, immediate, done, secs }
  var timer = null;

  /* ───── building an exam ───── */
  function allocation(n, pool) {
    var total = 0; D.DOMAINS.forEach(function (d) { total += d.w; });
    var rows = D.DOMAINS.map(function (d) {
      var exact = n * d.w / total, avail = pool.filter(function (q) { return q.d === d.k; }).length;
      return { k: d.k, cnt: Math.min(Math.floor(exact), avail), rem: exact - Math.floor(exact) + Math.random() * 0.5, avail: avail };
    });
    var cur = rows.reduce(function (s, r) { return s + r.cnt; }, 0);
    rows.sort(function (a, b) { return b.rem - a.rem; });
    var guard = 0;
    while (cur < n && guard++ < 500) {
      for (var i = 0; i < rows.length && cur < n; i++) { if (rows[i].cnt < rows[i].avail) { rows[i].cnt++; cur++; } }
    }
    return rows;
  }
  function weight(q) {
    var s = qstats[q.id], w = Math.random();
    if (!prefs.prioritize) { return w; }
    if (!s || !s.seen) { return w + 1.5; }            // never seen
    if (s.lastOk === 0) { return w + 3; }              // missed last time
    return w;                                          // answered right last time
  }
  function pickQuestions(n, pool) {
    var chosen = [];
    allocation(n, pool).forEach(function (r) {
      var cand = pool.filter(function (q) { return q.d === r.k; }).map(function (q) { return { q: q, w: weight(q) }; });
      cand.sort(function (a, b) { return b.w - a.w; });
      cand.slice(0, r.cnt).forEach(function (c) { chosen.push(c.q); });
    });
    return D.shuffle(chosen);
  }
  function startExam(pool) {
    var qs = pickQuestions(Math.min(N, pool.length), pool);
    exam = {
      items: qs.map(function (q) { return { q: q, order: D.shuffle(q.o.map(function (_, i) { return i; })), pick: null }; }),
      i: 0, t0: Date.now(), immediate: !!prefs.immediate, done: false, secs: 0
    };
    clearInterval(timer);
    timer = setInterval(tick, 1000);
    render();
  }
  function tick() { var el = document.getElementById('clock'); if (el && exam && !exam.done) { el.textContent = fmt(Math.floor((Date.now() - exam.t0) / 1000)); } }
  function fmt(s) { var m = Math.floor(s / 60); s = s % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  function finish() {
    clearInterval(timer);
    exam.done = true; exam.secs = Math.floor((Date.now() - exam.t0) / 1000);
    var ok = 0;
    exam.items.forEach(function (it) {
      var good = it.pick === 0 ? 1 : 0; ok += good;
      var s = qstats[it.q.id] || { seen: 0, ok: 0, ko: 0 };
      s.seen++; if (it.pick !== null) { if (good) { s.ok++; } else { s.ko++; } } else { s.ko++; }
      s.lastOk = good; qstats[it.q.id] = s;
    });
    exam.ok = ok; exam.pct = Math.round(100 * ok / exam.items.length);
    history.unshift({ ts: Date.now(), lang: D.lang(), n: exam.items.length, ok: ok, pct: exam.pct, secs: exam.secs });
    history = history.slice(0, 20);
    D.save(QKEY, qstats); D.save(HKEY, history);
    render();
  }

  /* ───── views ───── */
  function viewStart() {
    var h = '<div class="content-section"><div class="callout"><strong>ℹ️</strong> ' + esc(u('info')) + '</div>';
    h += '<div class="st-setup"><fieldset><legend>' + esc(u('language')) + '</legend><label><input type="radio" name="qlang" value="es"' + (D.lang() === 'es' ? ' checked' : '') + '> Español</label> <label><input type="radio" name="qlang" value="en"' + (D.lang() === 'en' ? ' checked' : '') + '> English</label></fieldset>';
    h += '<label class="st-check"><input type="checkbox" id="pimm"' + (prefs.immediate ? ' checked' : '') + '> ' + esc(u('immediate')) + '</label>';
    h += '<label class="st-check"><input type="checkbox" id="ppri"' + (prefs.prioritize ? ' checked' : '') + '> ' + esc(u('prioritize')) + '</label>';
    h += '<p class="st-note">' + bank.length + ' ' + esc(u('bank')) + '</p>';
    h += '<button type="button" class="st-btn big" data-act="start">' + esc(u('start')) + '</button></div></div>';
    h += '<div class="content-section"><h2 class="section-title">' + esc(u('hist')) + '</h2>';
    if (!history.length) { h += '<p>' + esc(u('noHist')) + '</p>'; }
    else {
      h += '<table><tr><th></th><th>' + esc(u('score')) + '</th><th>%</th><th>' + esc(u('time')) + '</th></tr>';
      history.slice(0, 8).forEach(function (r) {
        h += '<tr><td>' + esc(new Date(r.ts).toLocaleString(D.lang() === 'en' ? 'en-GB' : 'es-ES', { dateStyle: 'short', timeStyle: 'short' })) + '</td><td>' + r.ok + '/' + r.n + '</td><td><b style="color:' + (r.pct >= PASS ? '#15803d' : '#b91c1c') + '">' + r.pct + ' %</b></td><td>' + fmt(r.secs) + '</td></tr>';
      });
      h += '</table><button type="button" class="st-mini" data-act="clear">' + esc(u('clear')) + '</button>';
    }
    return h + '</div>';
  }
  function viewQuestion() {
    var it = exam.items[exam.i], q = it.q, n = exam.items.length;
    var locked = exam.immediate && it.pick !== null;
    var h = '<div class="st-qhead"><span>' + esc(u('q')) + ' <b>' + (exam.i + 1) + '</b> ' + esc(u('of')) + ' ' + n + '</span><span class="badge badge-blue">' + esc(D.domainName(q.d)) + '</span><span>⏱ <b id="clock">' + fmt(Math.floor((Date.now() - exam.t0) / 1000)) + '</b></span></div>';
    h += '<div class="st-bar" aria-hidden="true"><i style="width:' + Math.round(100 * (exam.i + 1) / n) + '%"></i></div>';
    h += '<div class="content-section st-q"><h2>' + esc(D.tx(q.q)) + '</h2><div class="st-opts">';
    it.order.forEach(function (oi, pos) {
      var cls = 'st-opt';
      if (it.pick === oi && !locked) { cls += ' sel'; }
      if (locked) { if (oi === 0) { cls += ' good'; } else if (it.pick === oi) { cls += ' bad'; } }
      h += '<button type="button" class="' + cls + '" data-opt="' + oi + '"' + (locked ? ' disabled' : '') + '><b>' + String.fromCharCode(65 + pos) + '</b><span>' + esc(D.tx(q.o[oi])) + '</span></button>';
    });
    h += '</div>';
    if (locked) { h += '<div class="callout ' + (it.pick === 0 ? '' : 'warn') + '"><strong>' + esc(it.pick === 0 ? u('right') : u('wrong')) + '.</strong> ' + esc(D.tx(q.e)) + '</div>'; }
    h += '</div><div class="st-nav"><button type="button" class="st-btn ghost" data-act="exit">' + esc(u('exit')) + '</button><span>';
    if (exam.i > 0) { h += '<button type="button" class="st-btn ghost" data-act="prev">' + esc(u('prev')) + '</button> '; }
    h += exam.i < n - 1 ? '<button type="button" class="st-btn" data-act="next">' + esc(u('next')) + '</button>' : '<button type="button" class="st-btn ok" data-act="finish">' + esc(u('finish')) + '</button>';
    return h + '</span></div>';
  }
  function viewResult() {
    var pass = exam.pct >= PASS, n = exam.items.length;
    var h = '<div class="content-section st-res"><h2 class="section-title">' + esc(u('result')) + '</h2><div class="st-score ' + (pass ? 'pass' : 'fail') + '"><b>' + exam.ok + '/' + n + '</b><span>' + exam.pct + ' %</span><em>' + esc(pass ? u('passed') : u('failed')) + ' · ' + esc(u('needs')) + ' · ⏱ ' + fmt(exam.secs) + '</em></div>';
    h += '<h3>' + esc(u('byDomain')) + '</h3><table><tr><th></th><th>' + esc(u('score')) + '</th></tr>';
    D.DOMAINS.forEach(function (d) {
      var its = exam.items.filter(function (it) { return it.q.d === d.k; });
      if (!its.length) { return; }
      var ok = its.filter(function (it) { return it.pick === 0; }).length;
      h += '<tr><td>' + esc(D.tx(d.n)) + '</td><td>' + ok + '/' + its.length + '</td></tr>';
    });
    h += '</table><div class="st-nav"><button type="button" class="st-btn" data-act="again">' + esc(u('again')) + '</button>';
    if (exam.items.some(function (it) { return it.pick !== 0; })) { h += '<button type="button" class="st-btn ghost" data-act="retry">' + esc(u('retry')) + '</button>'; }
    h += '<button type="button" class="st-btn ghost" data-act="home">' + esc(u('home')) + '</button></div></div>';
    h += '<div class="content-section"><h2 class="section-title">' + esc(u('review')) + '</h2>';
    exam.items.forEach(function (it, i) {
      var good = it.pick === 0;
      h += '<div class="st-rev ' + (good ? 'good' : 'bad') + '"><h3>' + (good ? '✅' : '❌') + ' ' + (i + 1) + '. ' + esc(D.tx(it.q.q)) + '</h3>';
      h += '<p><b>' + esc(u('yours')) + ':</b> ' + esc(it.pick === null ? u('none') : D.tx(it.q.o[it.pick])) + '</p>';
      if (!good) { h += '<p><b>' + esc(u('correct')) + ':</b> ' + esc(D.tx(it.q.o[0])) + '</p>'; }
      h += '<p class="st-exp"><b>' + esc(u('exp')) + ':</b> ' + esc(D.tx(it.q.e)) + '</p></div>';
    });
    return h + '</div>';
  }
  function render() {
    var root = document.getElementById('app');
    root.innerHTML = !exam ? viewStart() : (exam.done ? viewResult() : viewQuestion());
    var lb = document.getElementById('lang'); if (lb) { lb.textContent = D.lang() === 'es' ? '🌐 English' : '🌐 Español'; }
    document.getElementById('ttl').textContent = u('title'); document.getElementById('sub').textContent = u('sub');
    document.title = u('title') + ' — Data Cloud Hub';
  }

  /* ───── events ───── */
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-opt]');
    if (o && exam && !exam.done) { exam.items[exam.i].pick = parseInt(o.dataset.opt, 10); render(); return; }
    var t = e.target.closest('[data-act]'); if (!t) { return; }
    var a = t.dataset.act;
    if (a === 'start') { startExam(bank); }
    else if (a === 'next') { exam.i++; render(); window.scrollTo(0, 0); }
    else if (a === 'prev') { exam.i--; render(); window.scrollTo(0, 0); }
    else if (a === 'finish') {
      var open = exam.items.some(function (it) { return it.pick === null; });
      if (!open || confirm(u('unanswered'))) { finish(); window.scrollTo(0, 0); }
    }
    else if (a === 'exit') { if (confirm(u('confirmExit'))) { clearInterval(timer); exam = null; render(); } }
    else if (a === 'again') { exam = null; startExam(bank); window.scrollTo(0, 0); }
    else if (a === 'retry') {
      var pool = exam.items.filter(function (it) { return it.pick !== 0; }).map(function (it) { return it.q; });
      startExam(pool); window.scrollTo(0, 0);
    }
    else if (a === 'home') { exam = null; render(); }
    else if (a === 'clear') { if (confirm(u('confirmClear'))) { history = []; qstats = {}; D.save(HKEY, history); D.save(QKEY, qstats); render(); } }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'qlang') { D.setLang(t.value); render(); }
    else if (t.id === 'pimm') { prefs.immediate = t.checked; D.save(PREF, prefs); }
    else if (t.id === 'ppri') { prefs.prioritize = t.checked; D.save(PREF, prefs); }
  });
  document.getElementById('lang').addEventListener('click', function () { D.setLang(D.lang() === 'es' ? 'en' : 'es'); render(); });
  render();
})();
