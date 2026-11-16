// Token Launch Radar — the page. Static, no framework, no network: everything it renders comes from
// ../data.js, which the entry's program (main.ts) writes from the sealed snapshot beside this page.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) return;
  var C = D.calibration, N = D.counts;

  // ---------------------------------------------------------------- formatting
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;';
    });
  }
  function usd(n) {
    if (n == null || !isFinite(n)) return '—';
    var neg = n < 0, s = String(Math.round(Math.abs(n))), out = '';
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ',';
      out += s[i];
    }
    return (neg ? '-$' : '$') + out;
  }
  function compact(n) {
    if (n == null || !isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'k';
    return '$' + Math.round(n);
  }
  function mult(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 10) return n.toFixed(0) + '×';
    if (n >= 1) return n.toFixed(2) + '×';
    return n.toFixed(3) + '×';
  }
  function pct(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(digits == null ? 2 : digits) + '%';
  }
  function pctOf(v, digits) { return (v * 100).toFixed(digits == null ? 1 : digits) + '%'; }
  function ageText(days) {
    if (days == null) return 'not recorded';
    if (days < 60) return days + ' days';
    if (days < 730) return Math.round(days / 30) + ' months';
    return (days / 365).toFixed(1) + ' years';
  }
  function byId(id) { return document.getElementById(id); }

  // ---------------------------------------------------------------- the header
  function renderHead() {
    byId('head-meta').innerHTML =
      '<span><span class="k">snapshot</span> <b>' + esc(D.as_of) + '</b></span>' +
      '<span><span class="k">floor</span> <b>' + usd(D.floor_usd) + '</b></span>' +
      '<span><span class="k">model</span> <b>' + esc(D.model_version) + '</b></span>' +
      '<span><span class="k">scored from</span> <b>' + esc((D.source || '').replace(/^DefiLlama\s*/, 'DefiLlama ')) + '</b></span>';
  }

  // ---------------------------------------------------------------- the headline figures
  function renderStats() {
    var midTvl = 5e7, mid = Math.exp(C.a + C.b * Math.log(midTvl));
    var tiles = [
      { v: String(N.protocols), l: 'protocols in the snapshot', h: N.with_token + ' record a token, ' + N.pre_token + ' do not', cls: '' },
      { v: String(N.ranked), l: 'pre-token protocols ranked', h: 'all ' + N.watchlist + ' of the watchlist, plus ' + (N.ranked - N.ranked_watchlist) + ' below the floor', cls: 'accent' },
      { v: String(C.cohort_size), l: 'launched protocols in the calibration', h: 'their own market caps set the multiple', cls: 'blue' },
      { v: mult(mid), l: 'fitted multiple at ' + compact(midTvl) + ' of TVL', h: 'one dollar of TVL, one dollar of launch value', cls: 'warm' },
      { v: 'ρ ' + C.spearman_rho.toFixed(3), l: 'rank agreement with the market', h: 'model order vs the cohort\u2019s own market caps', cls: '' },
      { v: '×' + C.band_p25.toFixed(2) + ' to ×' + C.band_p75.toFixed(2), l: 'the middle half of the cohort', h: 'every row carries its own band', cls: '' },
    ];
    byId('stats').innerHTML = tiles.map(function (t) {
      return '<div class="stat ' + t.cls + '"><div class="v">' + esc(t.v) + '</div><div class="l">' + esc(t.l) + '</div><div class="h">' + esc(t.h) + '</div></div>';
    }).join('');
  }

  // ---------------------------------------------------------------- the model card
  function plot() {
    var W = 640, H = 268, pad = { l: 46, r: 12, t: 12, b: 26 };
    var x0 = 6.0, x1 = 11.2, y0 = -2.2, y1 = 1.6; // log10 TVL, log10 multiple
    function px(lx) { return pad.l + ((lx - x0) / (x1 - x0)) * (W - pad.l - pad.r); }
    function py(ly) { return H - pad.b - ((ly - y0) / (y1 - y0)) * (H - pad.t - pad.b); }
    var s = [];
    s.push('<svg class="plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The cohort\u2019s own launched protocols: TVL against the multiple of TVL their token trades at, with the fitted line">');
    for (var lx = 6; lx <= 11; lx++) {
      s.push('<line class="grid" x1="' + px(lx).toFixed(1) + '" y1="' + pad.t + '" x2="' + px(lx).toFixed(1) + '" y2="' + (H - pad.b) + '"/>');
      s.push('<text x="' + px(lx).toFixed(1) + '" y="' + (H - pad.b + 13) + '" text-anchor="middle">' + (lx === 6 ? '1M' : lx === 7 ? '10M' : lx === 8 ? '100M' : lx === 9 ? '1B' : lx === 10 ? '10B' : '100B') + '</text>');
    }
    for (var ly = -2; ly <= 2; ly++) {
      s.push('<line class="grid" x1="' + pad.l + '" y1="' + py(ly).toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + py(ly).toFixed(1) + '"/>');
      s.push('<text x="' + (pad.l - 6) + '" y="' + (py(ly) + 3).toFixed(1) + '" text-anchor="end">' + (ly === 0 ? '1×' : ly < 0 ? '0.' + '0'.repeat(-ly - 1) + '1×' : Math.pow(10, ly) + '×') + '</text>');
    }
    for (var i = 0; i < C.cohort.length; i++) {
      var r = C.cohort[i];
      var ltv = Math.log(Math.max(1, r.tvl_usd)) / Math.LN10;
      var lm = Math.log(Math.max(1e-6, r.multiple)) / Math.LN10;
      if (ltv < x0 || ltv > x1 || lm < y0 || lm > y1) continue;
      s.push('<circle class="dot" cx="' + px(ltv).toFixed(1) + '" cy="' + py(lm).toFixed(1) + '" r="2.6"/>');
    }
    var pts = [];
    for (var lx2 = x0; lx2 <= x1; lx2 += 0.1) {
      var lm2 = (C.a + C.b * lx2 * Math.LN10) / Math.LN10;
      pts.push(px(lx2).toFixed(1) + ',' + py(lm2).toFixed(1));
    }
    s.push('<polyline class="line" points="' + pts.join(' ') + '"/>');
    s.push('<text class="lab" x="' + (pad.l + 6) + '" y="' + (pad.t + 12) + '">each dot: a launched protocol the snapshot records</text>');
    s.push('<text class="lab" x="' + (W - pad.r) + '" y="' + (H - pad.b - 6) + '" text-anchor="end">line: the fitted launch multiple</text>');
    s.push('</svg>');
    return s.join('');
  }

  function renderModelCard() {
    var rows = [
      ['cohort', 'launched protocols with a TVL and a market cap', String(C.cohort_size), ''],
      ['multiple at TVL T', 'exp(' + C.a.toFixed(4) + ' + ' + C.b.toFixed(4) + ' × ln T)', '', ''],
      ['slope, b', 'a bigger protocol commands a smaller multiple of its TVL', C.b.toFixed(4), 't ' + C.t_b.toFixed(2)],
      ['intercept, a', 'the level the slope is anchored at', C.a.toFixed(4), 't ' + C.t_a.toFixed(2)],
      ['R²', 'how much of the cohort\u2019s spread the slope explains, in log space', C.r2.toFixed(3), ''],
      ['rank agreement, ρ', 'model order against the cohort\u2019s own market caps', C.spearman_rho.toFixed(3), ''],
      ['out of sample', 'fit on half the cohort, scored on the other half', '×' + C.holdout.median_factor.toFixed(2) + ' median miss', C.holdout.n_test + ' held out'],
      ['band', 'the cohort\u2019s own spread around the fit, 25th to 75th', '×' + C.band_p25.toFixed(2) + ' to ×' + C.band_p75.toFixed(2), 'every row carries it'],
      ['residual spread', 'the same spread at the 10th and 90th', '×' + C.band_p10.toFixed(2) + ' to ×' + C.band_p90.toFixed(2), ''],
      ['growth slope', 'per 100% of seven-day TVL growth, on the cohort', C.growth_slope.toFixed(3), 't ' + C.growth_t.toFixed(2) + ', n ' + C.growth_n],
      ['age slope', 'per ' + D.model.age_days_ref + ' days the snapshot has tracked the protocol', C.age_slope.toFixed(4), 't ' + C.age_t.toFixed(2) + ', n ' + C.age_n],
    ];
    var table = rows.map(function (r) {
      return '<tr><td>' + esc(r[0]) + ' <span style="color:var(--muted)">' + esc(r[1]) + '</span></td>' +
        '<td class="num">' + esc(r[2]) + (r[3] ? ' <span style="color:var(--muted)">' + esc(r[3]) + '</span>' : '') + '</td></tr>';
    }).join('');

    byId('modelcard').innerHTML =
      '<summary>How the implied value is computed <span class="hint">' + esc(D.model_version) +
      ' · fitted on the snapshot\u2019s own ' + C.cohort_size + ' launched protocols · every row carries its band</span></summary>' +
      '<div class="modelgrid"><div>' +
      '<h3>The formula</h3>' +
      '<div class="formula">' +
      'multiple(T) = exp(<b>' + C.a.toFixed(4) + '</b> + <b>' + C.b.toFixed(4) + '</b> × ln T)   T = the protocol\u2019s TVL in dollars\n' +
      'growth(T)   = exp(±<b>' + pctOf(D.model.growth_cap, 0) + '</b> × tanh(change_7d / <b>' + C.growth_sd.toFixed(2) + '</b>))  the fitted sign, one cohort spread, capped\n' +
      'age(T)      = exp(<b>' + C.age_slope.toFixed(4) + '</b> × min(days_with_no_token, <b>' + D.model.age_days_ref + '</b>) / <b>' + D.model.age_days_ref + '</b>)  capped at ' + pctOf(D.model.age_cap, 0) + '\n' +
      '\n<b>implied value = TVL × multiple(TVL) × growth × age</b>\n' +
      'band = implied × the cohort\u2019s own 25th to 75th residual, ×' + C.band_p25.toFixed(2) + ' to ×' + C.band_p75.toFixed(2) +
      '</div>' +
      '<h3 style="margin-top:14px">The evidence, as the program measured it</h3>' +
      '<table class="evidence"><tbody>' + table + '</tbody></table>' +
      '</div><div>' +
      '<h3>The cohort, and the curve through it</h3>' + plot() +
      '<h3 style="margin-top:14px">The cohort\u2019s own multiples</h3>' +
      '<table class="evidence"><thead><tr><th>TVL of the launched cohort</th><th class="num">n</th><th class="num">median multiple</th><th class="num">the fit there</th></tr></thead><tbody>' +
      C.buckets.map(function (b) {
        return '<tr><td>' + esc(b.label) + '</td><td class="num">' + b.n + '</td><td class="num">' + mult(b.median_multiple) +
          '</td><td class="num">' + mult(Math.exp(C.a + C.b * Math.log(Math.max(1, b.median_tvl_usd)))) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p style="margin-top:12px">Read a row as: <strong>TVL</strong> from the snapshot, <strong>7d</strong> its TVL change, <strong>age</strong> the time ' +
      'DefiLlama has tracked it with no token recorded, <strong>multiple</strong> the fitted launch multiple of TVL, <strong>implied value</strong> their product with the two ' +
      'bounded adjustments and the cohort\u2019s middle-half band. Growth and age enter at the fitted sign but are weak on this cohort (t ' + C.growth_t.toFixed(2) + ' and ' + C.age_t.toFixed(2) +
      '), so each is capped and neither decides a ranking alone. Protocols that record a token are in the Live token cohort tab, never in the ranking.</p>' +
      '</div></div>';
  }

  // ---------------------------------------------------------------- the board
  var state = { q: '', cat: '', chain: '', floor: 'any', order: 'implied', view: 'board', open: null };
  var ROWS = D.rows;

  function categories() {
    var seen = {}, out = [];
    for (var i = 0; i < ROWS.length; i++) {
      var c = ROWS[i].category || 'none recorded';
      if (!seen[c]) { seen[c] = 1; out.push(c); }
    }
    return out.sort();
  }
  function chains() {
    var seen = {}, out = [];
    for (var i = 0; i < ROWS.length; i++) for (var j = 0; j < ROWS[i].chains.length; j++) {
      var c = ROWS[i].chains[j];
      if (!seen[c]) { seen[c] = 1; out.push(c); }
    }
    return out.sort();
  }

  function renderControls() {
    var cat = byId('cat'), chain = byId('chain');
    cat.innerHTML = '<option value="">every category</option>' + categories().map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    chain.innerHTML = '<option value="">every chain</option>' + chains().map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
  }

  function matches(r) {
    if (state.cat && (r.category || 'none recorded') !== state.cat) return false;
    if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
    if (state.floor === 'watchlist' && !r.on_watchlist) return false;
    if (state.floor === 'over' && r.tvl_usd < D.floor_usd) return false;
    if (state.floor === 'under' && r.tvl_usd >= D.floor_usd) return false;
    if (state.q) {
      var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function ordered(rows) {
    var out = rows.slice();
    var cmp = {
      implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d); },
      age: function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days); },
      multiple: function (a, b) { return b.multiple - a.multiple; },
    }[state.order];
    out.sort(function (a, b) { return cmp(a, b) || a.rank - b.rank; });
    return out;
  }

  function topImplied() {
    var m = 0;
    for (var i = 0; i < ROWS.length; i++) if (ROWS[i].implied_value_usd > m) m = ROWS[i].implied_value_usd;
    return m || 1;
  }

  function renderBoard() {
    var head = ['#', 'protocol', 'category', 'chains', 'TVL', '7d change', 'age, no token', 'multiple', 'implied value', 'plan'];
    var keys = [null, null, null, null, 'tvl', 'growth', 'age', 'multiple', 'implied', null];
    var cls = ['', '', '', '', 'num', 'num', 'num', 'num', 'num', ''];
    byId('thead').innerHTML = '<tr>' + head.map(function (h, i) {
      var sortable = keys[i] ? ' class="sortable ' + cls[i] + (state.order === keys[i] ? ' on' : '') + '" data-order="' + keys[i] + '"' : ' class="' + cls[i] + '"';
      return '<th' + sortable + '>' + esc(h) + (state.order === keys[i] ? ' ▾' : '') + '</th>';
    }).join('') + '</tr>';

    var rows = ordered(ROWS.filter(matches));
    var top = topImplied();
    byId('tbody').innerHTML = rows.map(function (r) {
      var g = r.change_7d;
      var gcls = g == null ? 'flat' : g > 0 ? 'up' : g < 0 ? 'down' : 'flat';
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.open === r.slug ? ' class="open"' : '') + '>' +
        '<td class="rank' + (r.rank <= 5 ? ' top' : '') + '">' + r.rank + '</td>' +
        '<td><div class="proto"><span class="n">' + esc(r.name) + (r.on_watchlist ? ' <span class="chip wl">watchlist</span>' : '') +
        '</span><span class="s">' + esc(r.slug) + '</span></div></td>' +
        '<td><span class="chip">' + esc(r.category || 'not recorded') + '</span></td>' +
        '<td><div class="chips">' + r.chains.slice(0, 3).map(function (c) { return '<span class="chip chain">' + esc(c) + '</span>'; }).join('') +
        (r.chains.length > 3 ? '<span class="chip">+' + (r.chains.length - 3) + '</span>' : '') + '</div></td>' +
        '<td class="num">' + compact(r.tvl_usd) + '</td>' +
        '<td class="num ' + gcls + '">' + pct(g) + '</td>' +
        '<td class="num">' + esc(ageText(r.age_days)) + '</td>' +
        '<td class="num">' + mult(r.multiple) + '</td>' +
        '<td class="num"><span class="val">' + compact(r.implied_value_usd) + '</span>' +
        '<span class="band">' + compact(r.band_low_usd) + ' – ' + compact(r.band_high_usd) + '</span>' +
        '<span class="bar"><i style="width:' + Math.max(2, Math.round((r.implied_value_usd / top) * 100)) + '%"></i></span></td>' +
        '<td><button class="ghost" type="button" data-open="' + esc(r.slug) + '">Steps</button></td>' +
        '</tr>';
    }).join('');
    byId('empty').hidden = rows.length > 0;
    byId('shown').textContent = 'showing ' + rows.length + ' of ' + ROWS.length + ' ranked · sorted by ' + state.order;
    byId('table').hidden = false;
    byId('livepanel').hidden = true;
  }

  // ---------------------------------------------------------------- the live cohort
  function renderLive() {
    byId('table').hidden = true;
    byId('empty').hidden = true;
    byId('livepanel').hidden = false;
    byId('cohort-n').textContent = String(C.cohort_size);
    byId('livethead').innerHTML = '<tr><th>protocol</th><th>category</th><th class="num">TVL</th><th class="num">market cap</th><th class="num">multiple</th><th class="num">7d change</th></tr>';
    byId('livebody').innerHTML = D.live.map(function (r) {
      var inCohort = r.multiple != null;
      return '<tr><td><div class="proto"><span class="n">' + esc(r.name) + '</span><span class="s">' + esc(r.slug) + '</span></div></td>' +
        '<td><span class="chip">' + esc(r.category || 'not recorded') + '</span></td>' +
        '<td class="num">' + compact(r.tvl_usd) + '</td>' +
        '<td class="num">' + compact(r.mcap_usd) + '</td>' +
        '<td class="num">' + (inCohort ? mult(r.multiple) : '—') + '</td>' +
        '<td class="num ' + (r.change_7d == null ? 'flat' : r.change_7d > 0 ? 'up' : 'down') + '">' + pct(r.change_7d) + '</td></tr>';
    }).join('');
    byId('shown').textContent = 'showing ' + D.live.length + ' of ' + N.with_token + ' protocols that record a token';
  }

  // ---------------------------------------------------------------- the drawer
  function peerLine(r) {
    var same = C.cohort.filter(function (c) { return (c.category || '') === (r.category || ''); });
    if (same.length === 0) return null;
    var ms = same.map(function (c) { return c.multiple; }).sort(function (a, b) { return a - b; });
    var med = ms[Math.floor(ms.length / 2)];
    return 'Among the ' + same.length + ' launched protocols in the cohort that share the category ' + (r.category || 'not recorded') +
      ', the median multiple is ' + mult(med) + ' — the model gives ' + r.name + ' ' + mult(r.multiple) + ' from its TVL alone.';
  }

  function renderDrawer(slug) {
    var r = null;
    for (var i = 0; i < ROWS.length; i++) if (ROWS[i].slug === slug) { r = ROWS[i]; break; }
    if (!r) return;
    state.open = slug;
    var peer = peerLine(r);
    var g = r.change_7d;
    var d = byId('drawer');
    d.hidden = false;
    d.innerHTML =
      '<button class="close" type="button" id="drawer-close">Close ✕</button>' +
      '<h2>' + esc(r.name) + '</h2><div class="slug">' + esc(r.slug) + ' · rank ' + r.rank + ' of ' + ROWS.length + '</div>' +
      '<div class="chips row">' +
      '<span class="chip">' + esc(r.category || 'category not recorded') + '</span>' +
      (r.on_watchlist ? '<span class="chip wl">on the watchlist</span>' : '<span class="chip">below the $50M floor</span>') +
      r.chains.slice(0, 6).map(function (c) { return '<span class="chip chain">' + esc(c) + '</span>'; }).join('') +
      (r.chains.length > 6 ? '<span class="chip">+' + (r.chains.length - 6) + ' chains</span>' : '') +
      '</div>' +
      '<div class="decomp">' +
      '<div class="row"><span>TVL, the snapshot\u2019s own figure</span><span>' + usd(r.tvl_usd) + '</span></div>' +
      '<div class="row"><span>× the fitted launch multiple of TVL</span><span>' + mult(r.multiple) + '</span></div>' +
      '<div class="row"><span>× seven-day growth, capped (' + pct(g) + ')</span><span>' + r.growth_multiplier.toFixed(3) + '×</span></div>' +
      '<div class="row"><span>× time tracked with no token (' + esc(ageText(r.age_days)) + ')</span><span>' + r.age_multiplier.toFixed(3) + '×</span></div>' +
      '<div class="row total"><span>implied launch value</span><span>' + usd(r.implied_value_usd) + '</span></div>' +
      '<div class="band">band, the cohort\u2019s middle half: ' + usd(r.band_low_usd) + ' to ' + usd(r.band_high_usd) + '</div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div><span>implied value</span><span>' + compact(r.implied_value_usd) + '</span></div>' +
      '<div><span>TVL</span><span>' + compact(r.tvl_usd) + '</span></div>' +
      '<div><span>7d TVL change</span><span>' + pct(g) + '</span></div>' +
      '<div><span>tracked since</span><span>' + esc(r.listed_at || 'not recorded') + '</span></div>' +
      '<div><span>time with no token</span><span>' + esc(ageText(r.age_days)) + '</span></div>' +
      '<div><span>ranking position</span><span>' + r.rank + ' of ' + ROWS.length + '</span></div>' +
      '</div>' +
      (peer ? '<p class="note" style="border:1px solid var(--line);border-radius:10px;padding:10px 12px">' + esc(peer) + '</p>' : '') +
      '<h3>The farm plan: ' + r.steps.length + ' steps</h3>' +
      '<ol class="plan">' + r.steps.map(function (s) {
        return '<li>' + esc(s.text) + '<div class="badges"><span>cost ' + esc(s.cost) + '</span><span>time ' + esc(s.time) + '</span></div></li>';
      }).join('') + '</ol>' +
      '<p class="caveat">The implied value is this entry\u2019s claim from the snapshot\u2019s figures, not advice and not make.fun\u2019s. ' +
      'A protocol that records no token may still hold one, and a farm position can lose what it holds.</p>';
    document.body.style.overflow = 'hidden';
    byId('drawer-close').addEventListener('click', closeDrawer);
    renderBoard();
  }
  function closeDrawer() {
    byId('drawer').hidden = true;
    state.open = null;
    document.body.style.overflow = '';
    renderBoard();
  }

  // ---------------------------------------------------------------- wiring
  function readHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return;
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      if (kv.length !== 2) return;
      var k = decodeURIComponent(kv[0]), v = decodeURIComponent(kv[1]);
      if (k === 'q' || k === 'cat' || k === 'chain' || k === 'floor' || k === 'order') state[k] = v;
    });
  }
  function applyState() {
    byId('q').value = state.q;
    byId('cat').value = state.cat;
    byId('chain').value = state.chain;
    byId('floor').value = state.floor;
    byId('order').value = state.order;
  }
  function view(v) {
    state.view = v;
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-view') === v;
      tabs[i].className = on ? 'tab on' : 'tab';
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (v === 'live') renderLive(); else renderBoard();
  }

  function start() {
    renderHead();
    renderStats();
    renderModelCard();
    renderControls();
    readHash();
    applyState();
    renderBoard();
    byId('foot-src').innerHTML = 'Snapshot: <code>' + esc(D.source) + '</code>';
    byId('q').addEventListener('input', function (e) { state.q = e.target.value.trim(); renderBoard(); });
    byId('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); });
    byId('chain').addEventListener('change', function (e) { state.chain = e.target.value; renderBoard(); });
    byId('floor').addEventListener('change', function (e) { state.floor = e.target.value; renderBoard(); });
    byId('order').addEventListener('change', function (e) { state.order = e.target.value; renderBoard(); });
    byId('reset').addEventListener('click', function () {
      state.q = ''; state.cat = ''; state.chain = ''; state.floor = 'any'; state.order = 'implied';
      applyState(); renderBoard();
    });
    byId('tabs').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.tab') : null;
      if (b) view(b.getAttribute('data-view'));
    });
    byId('thead').addEventListener('click', function (e) {
      var th = e.target.closest ? e.target.closest('th[data-order]') : null;
      if (th) { state.order = th.getAttribute('data-order'); byId('order').value = state.order; renderBoard(); }
    });
    byId('tbody').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-open]') : null;
      if (btn) { renderDrawer(btn.getAttribute('data-open')); return; }
      var tr = e.target.closest ? e.target.closest('tr[data-slug]') : null;
      if (tr) renderDrawer(tr.getAttribute('data-slug'));
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) closeDrawer(); });
  }
  start();
})();
