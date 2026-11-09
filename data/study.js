/* Shared helpers for the flashcards and the exam simulator: storage, language, domains. */
(function () {
  var mem = {};
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function load(k, d) { try { var v = get(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, o) { set(k, JSON.stringify(o)); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var lang = get('dc:lang') === 'en' ? 'en' : 'es';
  document.documentElement.lang = lang;

  var DOMAINS = [
    { k: 'act', w: 20, n: ['Activaciones y utilización', 'Data Activations and Utilization'] },
    { k: 'ing', w: 18, n: ['Conexión e ingesta', 'Data Source Connection and Ingestion'] },
    { k: 'enh', w: 18, n: ['Mejoras, compartición y análisis', 'Data Enhancements, Sharing, and Analysis'] },
    { k: 'har', w: 17, n: ['Armonización y unificación', 'Harmonization and Unification'] },
    { k: 'pos', w: 14, n: ['Solution Positioning', 'Solution Positioning'] },
    { k: 'set', w: 13, n: ['Setup y administración', 'Data 360 Setup and Administration'] }
  ];

  window.DCS = {
    get: get, set: set, load: load, save: save, hash: hash, esc: esc, shuffle: shuffle, DOMAINS: DOMAINS,
    lang: function () { return lang; },
    setLang: function (l) { lang = l === 'en' ? 'en' : 'es'; set('dc:lang', lang); document.documentElement.lang = lang; },
    /* pick the text for the current language from a [es, en] pair (or a plain string) */
    tx: function (p) { return typeof p === 'string' ? p : p[lang === 'en' ? 1 : 0]; },
    domainName: function (k) { for (var i = 0; i < DOMAINS.length; i++) { if (DOMAINS[i].k === k) { return DOMAINS[i].n[lang === 'en' ? 1 : 0]; } } return k; }
  };
})();
