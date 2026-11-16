// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// radar-2 — a calibrated launch multiple, fitted from the snapshot's own launched protocols.
//
// The board covers every pre-token protocol in the watchlist (the floor, never a ceiling) and adds
// every other pre-token protocol the snapshot carries: the early rows the radar exists to find.
//
// The implied value never comes from a table of names. It is:
//
//   multiple(TVL) = exp(a + b * ln TVL)      a and b fitted, in log space, on the snapshot's own
//                                            protocols whose token already trades and records a
//                                            market cap (the calibration cohort)
//   G(growth)     = 1 + GROWTH_SHRINK * growthSlope * clamped(change_7d) / 100
//   A(age)        = exp(ageSlope * min(age_days, 1095) / 1095)
//   implied       = TVL * multiple(TVL) * clamped(G) * clamped(A)
//
// Every constant above is measured at run time from the snapshot and written into the dashboard, so
// the model card a reader sees is the model that ranked the board. growthSlope and ageSlope are the
// cohort's own cross-sectional slopes; both are weak (see the t statistics the model card prints) and
// both are bounded by a cap so a noisy term can never decide a ranking on its own.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** Growth enters at the cohort's fitted sign, as a one-sigma move, never past this much either way. */
export const GROWTH_CAP = 0.12;
/** The time a protocol has run with no token enters at the fitted slope, capped at this much. */
export const AGE_CAP = 0.35;
/** The age the maturity curve saturates at: three years of DefiLlama tracking. */
export const AGE_DAYS_REF = 1095;
/** Reported as a whole dollar, so the board's smallest value is one dollar, never zero. */
export const MIN_IMPLIED_USD = 1;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One fit of log(target) on a feature matrix, with the statistics the model card prints. */
export interface Fit {
  /** The coefficients, in feature order, the intercept first. */
  coef: number[];
  /** The standard error of each coefficient. */
  se: number[];
  /** The coefficient over its standard error. */
  t: number[];
  /** R squared of the fit in log space. */
  r2: number;
  /** The rows the fit used. */
  n: number;
}

/** One TVL decade of the calibration cohort: the median launched multiple inside it. */
export interface Bucket {
  label: string;
  lo_usd: number;
  hi_usd: number;
  n: number;
  /** The median TVL of the cohort rows inside this bucket: where the fit is read off for it. */
  median_tvl_usd: number;
  median_multiple: number;
}

/** The snapshot's own launched protocols, with the market cap and the multiple each one traded at. */
export interface CohortRow {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
  multiple: number;
  change_7d: number | null;
  age_days: number | null;
}

/** Everything the model measured on the snapshot before it scored a single pre-token protocol. */
export interface Calibration {
  cohort_size: number;
  min_tvl_usd: number;
  max_tvl_usd: number;
  /** multiple(TVL) = exp(a + b * ln TVL), fitted on the cohort. */
  a: number;
  b: number;
  se_a: number;
  se_b: number;
  t_a: number;
  t_b: number;
  r2: number;
  /** The residual factors of the fit at the 10th, 50th and 90th percentile: the board's band. */
  band_p10: number;
  band_p50: number;
  band_p90: number;
  /** Rank agreement between the model's implied value and the market's own market cap, on the cohort. */
  spearman_rho: number;
  /** A fit on even-index cohort rows, scored on the odd ones: how far out of sample it was. */
  holdout: { n_train: number; n_test: number; median_factor: number; within_2x: number };
  /** The cohort's cross-sectional slope on seven-day TVL growth, per 100 per cent. */
  growth_slope: number;
  growth_t: number;
  growth_n: number;
  /** The cohort's own weekly-growth distribution: the centre and spread a one-sigma move is read from. */
  growth_median: number;
  growth_sd: number;
  /** The cohort's cross-sectional slope on the days DefiLlama has tracked the protocol, per 1095 days. */
  age_slope: number;
  age_t: number;
  age_n: number;
  /** The residual band multipliers the board's rows carry: the middle half of the cohort. */
  band_p25: number;
  band_p75: number;
  buckets: Bucket[];
  cohort: CohortRow[];
}

/** One row of the ranked board. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  on_watchlist: boolean;
  implied_value_usd: number;
  band_low_usd: number;
  band_high_usd: number;
  model: {
    multiple: number;
    growth_multiplier: number;
    age_multiplier: number;
    growth_pct: number | null;
  };
  /** The plan as its parts, for the drawer; farm_steps is the same plan as the gate's strings. */
  steps: FarmStep[];
  farm_steps: string[];
}

/** The dashboard's compact view of one row: the block of figures the table and the drawer render. */
export interface RadarStep {
  text: string;
  cost: string;
  time: string;
}

export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  on_watchlist: boolean;
  implied_value_usd: number;
  band_low_usd: number;
  band_high_usd: number;
  multiple: number;
  growth_multiplier: number;
  age_multiplier: number;
  steps: RadarStep[];
}

/** A protocol whose token already trades: the board shows the market's own figures, never a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  multiple: number | null;
}

/** Everything the dashboard needs: the board, the live set, the calibration and the counts. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  model: {
    growth_cap: number;
    age_cap: number;
    age_days_ref: number;
  };
  counts: {
    protocols: number;
    with_token: number;
    pre_token: number;
    ranked: number;
    ranked_watchlist: number;
    watchlist: number;
    below_floor: number;
    live_shown: number;
  };
  calibration: Calibration;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether the snapshot records a market cap for the protocol's token. */
export function hasTraded(p: SnapshotProtocol): boolean {
  return !isPreToken(p) && (p.mcap_usd ?? 0) > 0 && p.tvl_usd > 0;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** The exchanges, which are never a pre-token protocol to farm. */
const EXCHANGES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** The categories a launch radar leaves out: a wrapped, staked, bridged or exchange product. */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** The whole words that mark a wrapped, staked or staking product of a token that already trades. */
const PRODUCT_WORDS = /(^|\s)(wrapped|staked|staking)(\s|$)/i;

/** Whether the board may rank a protocol: it records no token, and it is not another token's product. */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (PRODUCT_WORDS.test(p.name)) return false;
  for (const ex of EXCHANGES) if (p.name.toLowerCase().startsWith(`${ex.toLowerCase()} `)) return false;
  return true;
}

// ---------------------------------------------------------------- the fit

/** Transpose-free least squares on small matrices: solve (X'X) c = X'y by Gauss-Jordan. */
function solveNormal(X: number[][], y: number[]): { coef: number[]; inv: number[][] } | null {
  const k = X[0]!.length;
  const n = X.length;
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < k; i++) {
    const row: number[] = [];
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let r = 0; r < n; r++) s += X[r]![i]! * X[r]![j]!;
      row.push(s);
    }
    A.push(row);
    let s = 0;
    for (let r = 0; r < n; r++) s += X[r]![i]! * y[r]!;
    B.push(s);
  }
  // The augmented matrix, the identity on the right, so one sweep gives the inverse too.
  const M: number[][] = A.map((row, i) => [...row, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)), B[i]!]);
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    if (Math.abs(M[piv]![c]!) < 1e-12) return null;
    const t = M[c]!;
    M[c] = M[piv]!;
    M[piv] = t;
    const pv = M[c]![c]!;
    for (let j = 0; j < 2 * k + 1; j++) M[c]![j] = M[c]![j]! / pv;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = M[r]![c]!;
      if (f === 0) continue;
      for (let j = 0; j < 2 * k + 1; j++) M[r]![j] = M[r]![j]! - f * M[c]![j]!;
    }
  }
  return { coef: M.map((row) => row[2 * k]!), inv: M.map((row) => row.slice(k, 2 * k)) };
}

/** A least-squares fit of log(target) on `feats`, with standard errors, t statistics and R squared. */
function fitLog(feats: number[][], target: number[]): Fit {
  const n = target.length;
  const solved = solveNormal(feats, target);
  if (solved === null) return { coef: feats[0]!.map(() => 0), se: feats[0]!.map(() => 0), t: feats[0]!.map(() => 0), r2: 0, n };
  const { coef, inv } = solved;
  const k = coef.length;
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    let yh = 0;
    for (let j = 0; j < k; j++) yh += coef[j]! * feats[i]![j]!;
    ssr += (target[i]! - yh) ** 2;
  }
  const mean = target.reduce((a, b) => a + b, 0) / n;
  let sst = 0;
  for (const v of target) sst += (v - mean) ** 2;
  const s2 = ssr / Math.max(1, n - k);
  const se = inv.map((row, i) => Math.sqrt(Math.max(0, s2 * row[i]!)));
  return { coef, se, t: coef.map((c, i) => (se[i]! > 0 ? c / se[i]! : 0)), r2: sst > 0 ? 1 - ssr / sst : 0, n };
}

/** A quantile of a sorted copy of `values`, by linear interpolation. */
function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

const median = (values: number[]): number => quantile(values, 0.5);

/** Spearman's rank correlation of two equal-length series. */
function spearman(xs: number[], ys: number[]): number {
  const rank = (v: number[]): number[] => {
    const idx = v.map((_, i) => i).sort((a, b) => (v[a]! - v[b]! !== 0 ? v[a]! - v[b]! : a - b));
    const r = new Array<number>(v.length);
    for (let k = 0; k < idx.length; k++) r[idx[k]!] = k + 1;
    return r;
  };
  const ra = rank(xs);
  const rb = rank(ys);
  const n = xs.length;
  if (n < 2) return 0;
  const ma = ra.reduce((a, b) => a + b, 0) / n;
  const mb = rb.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2;
    db += (rb[i]! - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/**
 * The calibration: the snapshot's launched protocols as the training set for the multiple a launch
 * should command. Every figure the dashboard states as evidence is measured here, at run time, from
 * the snapshot alone.
 */
export function calibrate(snapshot: Snapshot): Calibration {
  const cohort: CohortRow[] = [];
  const growth_rows: number[][] = [];
  const growth_target: number[] = [];
  const age_rows: number[][] = [];
  const age_target: number[] = [];
  for (const p of snapshot.protocols) {
    if (!hasTraded(p)) continue;
    const tvl = p.tvl_usd;
    const mcap = p.mcap_usd!;
    const age = ageDays(snapshot.as_of, p.listed_at);
    const multiple = mcap / tvl;
    cohort.push({ slug: p.slug, name: p.name, category: p.category, tvl_usd: tvl, mcap_usd: mcap, multiple, change_7d: p.change_7d, age_days: age });
    // The growth slope is read on the cohort rows that report a seven-day change.
    if (p.change_7d !== null) {
      growth_rows.push([1, Math.log(tvl), clamp(p.change_7d, -60, 120) / 100]);
      growth_target.push(Math.log(multiple));
    }
    // The age slope is read on the rows that also carry a listing day.
    if (age !== null && age > 0) {
      age_rows.push([1, Math.log(tvl), Math.min(age, AGE_DAYS_REF) / AGE_DAYS_REF]);
      age_target.push(Math.log(multiple));
    }
  }
  cohort.sort((x, y) => (x.slug < y.slug ? -1 : x.slug > y.slug ? 1 : 0));

  const feats = cohort.map((c) => [1, Math.log(c.tvl_usd)]);
  const target = cohort.map((c) => Math.log(c.multiple));
  const main = fitLog(feats, target);
  const a = main.coef[0] ?? 0;
  const b = main.coef[1] ?? 0;

  // The band: the fitted row is the median of the cohort, so the residual quantiles say how far a
  // single protocol's own market cap sat from what the model would have said.
  const residuals: number[] = [];
  let rho_lhs: number[] = [];
  let rho_rhs: number[] = [];
  for (let i = 0; i < cohort.length; i++) {
    const pred = Math.exp(a + b * Math.log(cohort[i]!.tvl_usd));
    residuals.push(target[i]! - (a + b * feats[i]![1]!));
    rho_lhs.push(cohort[i]!.tvl_usd * pred);
    rho_rhs.push(cohort[i]!.mcap_usd);
  }
  const band_p10 = Math.exp(quantile(residuals, 0.1));
  const band_p50 = Math.exp(quantile(residuals, 0.5));
  const band_p90 = Math.exp(quantile(residuals, 0.9));

  // Out of sample: fit on the even-index rows, score the odd ones.
  const train: number[][] = [];
  const train_y: number[] = [];
  const test: CohortRow[] = [];
  for (let i = 0; i < cohort.length; i++) {
    if (i % 2 === 0) {
      train.push([1, Math.log(cohort[i]!.tvl_usd)]);
      train_y.push(Math.log(cohort[i]!.multiple));
    } else test.push(cohort[i]!);
  }
  const oos = fitLog(train, train_y);
  let within = 0;
  const ratios: number[] = [];
  for (const c of test) {
    const pred = Math.exp((oos.coef[0] ?? 0) + (oos.coef[1] ?? 0) * Math.log(c.tvl_usd));
    const ratio = c.multiple / pred;
    ratios.push(ratio > 1 ? ratio : 1 / ratio);
    if (ratio <= 2 && ratio >= 0.5) within++;
  }

  const growth_fit = growth_rows.length > 2 ? fitLog(growth_rows, growth_target) : null;
  const age_fit = age_rows.length > 2 ? fitLog(age_rows, age_target) : null;

  // The cohort's own weekly-growth distribution: a one-sigma move is what the growth term reads.
  const growth_values = cohort.map((c) => clamp(c.change_7d ?? 0, -60, 120));
  const growth_median = median(growth_values);
  const growth_mean = growth_values.reduce((a, b) => a + b, 0) / Math.max(1, growth_values.length);
  const growth_sd = Math.sqrt(growth_values.reduce((a, b) => a + (b - growth_mean) ** 2, 0) / Math.max(1, growth_values.length - 1));

  // The cohort's own multiple, by decade of TVL: the table the model card prints beside the curve.
  const edges = [0, 1e7, 1e8, 1e9, 1e10, Infinity];
  const labels = ['under $10M', '$10M to $100M', '$100M to $1B', '$1B to $10B', 'over $10B'];
  const buckets: Bucket[] = [];
  for (let i = 0; i < labels.length; i++) {
    const inside = cohort.filter((c) => c.tvl_usd >= edges[i]! && c.tvl_usd < edges[i + 1]!);
    if (inside.length === 0) continue;
    buckets.push({
      label: labels[i]!,
      lo_usd: edges[i]!,
      hi_usd: edges[i + 1]!,
      n: inside.length,
      median_tvl_usd: median(inside.map((c) => c.tvl_usd)),
      median_multiple: median(inside.map((c) => c.multiple)),
    });
  }

  return {
    cohort_size: cohort.length,
    min_tvl_usd: cohort.length > 0 ? Math.min(...cohort.map((c) => c.tvl_usd)) : 0,
    max_tvl_usd: cohort.length > 0 ? Math.max(...cohort.map((c) => c.tvl_usd)) : 0,
    a,
    b,
    se_a: main.se[0] ?? 0,
    se_b: main.se[1] ?? 0,
    t_a: main.t[0] ?? 0,
    t_b: main.t[1] ?? 0,
    r2: main.r2,
    band_p10,
    band_p50,
    band_p90,
    band_p25: Math.exp(quantile(residuals, 0.25)),
    band_p75: Math.exp(quantile(residuals, 0.75)),
    spearman_rho: spearman(rho_lhs, rho_rhs),
    holdout: { n_train: train.length, n_test: test.length, median_factor: median(ratios), within_2x: test.length > 0 ? within / test.length : 0 },
    growth_slope: growth_fit?.coef[2] ?? 0,
    growth_t: growth_fit?.t[2] ?? 0,
    growth_n: growth_rows.length,
    growth_median,
    growth_sd,
    age_slope: age_fit?.coef[2] ?? 0,
    age_t: age_fit?.t[2] ?? 0,
    age_n: age_rows.length,
    buckets,
    cohort,
  };
}

// ---------------------------------------------------------------- the value

/** What the model says about one pre-token protocol. */
export interface ValueParts {
  multiple: number;
  growth_multiplier: number;
  age_multiplier: number;
  growth_pct: number | null;
  implied: number;
  band_low: number;
  band_high: number;
}

/** The three multipliers and the implied value of one pre-token protocol under `cal`. */
export function impliedValue(p: SnapshotProtocol, asOf: string, cal: Calibration): ValueParts {
  const tvl = Math.max(1, p.tvl_usd);
  const multiple = Math.exp(cal.a + cal.b * Math.log(tvl));
  // Growth: the fitted sign, read as a move of the cohort's own weekly spread and bounded by the cap,
  // so the model's noisiest term can never swing a row by more than GROWTH_CAP either way.
  const growth = clamp(p.change_7d ?? 0, -60, 120);
  const z = cal.growth_sd > 0 ? clamp(growth / cal.growth_sd, -3, 3) : 0;
  const sign = cal.growth_slope >= 0 ? 1 : -1;
  const growth_multiplier = Math.exp(sign * GROWTH_CAP * Math.tanh(z));
  // Age: how long the snapshot has tracked the protocol with no token recorded, at the fitted slope.
  const age = ageDays(asOf, p.listed_at);
  const age_multiplier = clamp(Math.exp(cal.age_slope * (age === null ? AGE_DAYS_REF / 2 : Math.min(age, AGE_DAYS_REF)) / AGE_DAYS_REF), 1 - AGE_CAP, 1);
  const raw = tvl * multiple * growth_multiplier * age_multiplier;
  const implied = Math.max(MIN_IMPLIED_USD, Math.round(raw));
  return {
    multiple,
    growth_multiplier,
    age_multiplier,
    growth_pct: p.change_7d,
    implied,
    // The board's band is the middle half of the cohort's own residual spread, stated as such.
    band_low: Math.max(MIN_IMPLIED_USD, Math.round(raw * cal.band_p25)),
    band_high: Math.max(MIN_IMPLIED_USD, Math.round(raw * cal.band_p75)),
  };
}

// ---------------------------------------------------------------- the farm plan

/** The gas a first transaction costs on a chain, in whole dollars, from the chains named. */
function gasFor(chains: string[]): { first: number; weekly: number; where: string } {
  const cheap = new Set(['Solana', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'BSC', 'Binance', 'Sui', 'Avalanche', 'Monad', 'Ink', 'Katana', 'Unichain', 'Stellar', 'Flare', 'Mezo', 'Linea', 'Scroll', 'Sonic', 'Hyperliquid L1', 'Tron', 'Noble', 'Bittensor', 'Corn', 'Ripple', 'XRPL EVM', 'Algorand', 'Mantle', 'Sei', 'Plume Mainnet', 'Berachain', 'Hemi', 'Sonic']);
  const name = chains[0] ?? 'its main chain';
  if (chains.length > 0 && cheap.has(name)) return { first: 1, weekly: 1, where: name };
  return { first: 6, weekly: 3, where: name };
}

/** How much capital one farm position needs, from the protocol's own TVL and its week. */
function capitalFor(tvl: number, change7d: number | null): number {
  const base =
    tvl >= 5_000_000_000 ? 400 : tvl >= 1_000_000_000 ? 250 : tvl >= 250_000_000 ? 150 : tvl >= 50_000_000 ? 100 : tvl >= 10_000_000 ? 60 : 40;
  // A protocol whose TVL fell hard in the week is a riskier place to leave capital: halve the position.
  if (change7d !== null && change7d <= -10) return Math.max(25, Math.round(base / 2));
  if (change7d !== null && change7d <= -5) return Math.max(25, Math.round((base * 3) / 4));
  return base;
}

/** How long to hold, from the protocol's age: a young protocol needs the longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 90;
  if (age < 365) return 60;
  if (age < 730) return 45;
  return 30;
}

/** One clause, in plain numbers, on what the protocol's own week says about the size of the position. */
function riskClause(p: SnapshotProtocol): string {
  const g = p.change_7d;
  if (g === null) return 'the snapshot records no seven-day change for it, so size it as if it were flat';
  if (g <= -10) return `its TVL fell ${Math.abs(g).toFixed(1)}% in the last week, so this plan halves the position`;
  if (g <= -5) return `its TVL fell ${Math.abs(g).toFixed(1)}% in the last week, so this plan sizes the position at three quarters`;
  if (g >= 15) return `its TVL rose ${g.toFixed(1)}% in the last week: farm it at full size, and expect the multiple to lag the flow`;
  return `its TVL moved ${g.toFixed(1)}% in the last week, which is within the range the cohort\u2019s own week usually moves`;
}

/** The one action the protocol's own category asks for, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and keep the vault shares in the wallet you farm with.`;
  if (c.includes('cdp')) return `Open a ${name} position on ${chain}: deposit $${capital} of collateral and mint the protocol's stable asset against it.`;
  if (c.includes('lend') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and leave the receipt token in the wallet.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s deepest pool on ${chain} and hold the LP position open.`;
  if (c.includes('stab')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it through the launch.`;
  if (c.includes('rwa') || c.includes('private credit')) return `Mint $${capital} of ${name}'s yield asset on ${chain} and hold it without moving it between wallets.`;
  if (c.includes('restak')) return `Restake $${capital} of the chain's staking asset through ${name} and keep the receipt token (never sell it).`;
  if (c.includes('staking') || c.includes('pool')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC into ${chain} through ${name} and put the bridged funds to work in its app.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) return `Deposit $${capital} of USDC as margin on ${name} and open one small, collateralised position on ${chain}.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active through the launch.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one position on a market ${name} runs on ${chain}.`;
  if (c.includes('payment') || c.includes('chain')) return `Move $${capital} of value onto ${chain} through ${name} and use its own app rather than a third-party front end.`;
  if (c.includes('governance')) return `Deposit $${capital} of the chain's asset into ${name} on ${chain}, then vote with the receipt where it is asked for.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The second action that deepens the position, by category: what a snapshot would count twice. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const half = Math.round(capital / 2);
  if (c.includes('curator') || c.includes('allocator')) return `Then borrow $${half} against the vault shares where ${p.name} allows it, or split the deposit across two of its vaults.`;
  if (c.includes('cdp')) return `Then use the minted stable asset inside ${p.name}'s own pools, so both the debt and the collateral count.`;
  if (c.includes('lend') || c.includes('collateral')) return `Then borrow $${half} of the supported stable against the deposit and return it, leaving the deposit in place.`;
  if (c.includes('dex') || c.includes('yield')) return `Then swap once through ${p.name} on ${chain} and, if it has one, stake the LP receipt in its farm.`;
  if (c.includes('bridge') || c.includes('chain')) return `Then make one round trip back through ${p.name} and leave a working balance behind on ${chain}.`;
  if (c.includes('restak') || c.includes('staking') || c.includes('pool')) return `Then delegate to a second operator ${p.name} lists, so more than one validator sees the wallet.`;
  return `Then make one more qualifying call on ${p.name}: a second deposit, a vote, or a swap, each on a different day.`;
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Keep the position open and check the protocol's own page.`;
  return s;
}

/** A whole dollar figure, grouped, from a number of dollars. */
export function usd(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i]!;
  }
  return `${n < 0 ? '-' : ''}$${out}`;
}

/**
 * A protocol's farm plan: the steps a farmer can follow, each with what it costs and how long it
 * takes. The plan is derived from the protocol's own record (category, chains, TVL, growth, age) and
 * from the value the model put on it, never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, value: ValueParts): FarmStep[] {
  const chain = p.chains[0] ?? 'its main chain';
  const chainCount = p.chains.length;
  const gas = gasFor(p.chains);
  const capital = capitalFor(p.tvl_usd, p.change_7d);
  const hold = holdDaysFor(age);
  const cadence = p.tvl_usd >= 1_000_000_000 ? 7 : p.tvl_usd >= 100_000_000 ? 5 : 3;
  const weeks = hold >= 60 ? 12 : hold >= 45 ? 8 : 6;
  const low = usd(value.band_low);
  const high = usd(value.band_high);
  const steps: FarmStep[] = [
    {
      text: `Fund a wallet you use only for this farm: it holds ${usd(capital)} of the farm budget, on ${chain}${chainCount > 1 ? ` and the ${chainCount - 1} other chains the snapshot records for ${p.name}` : ''}.`,
      cost: `about ${usd(gas.first)} of gas for the first transaction on ${gas.where}`,
      time: '10 minutes, once',
    },
    {
      text: `${actionFor(p, capital, chain)} It is sized that way because ${riskClause(p)}.`,
      cost: `${usd(capital)} of capital, plus about ${usd(gas.first)} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, capital, chain),
      cost: `about ${usd(gas.weekly * 2)} of gas, no new capital`,
      time: '20 minutes, one day later',
    },
    {
      text: `Make one qualifying call every ${cadence} days for ${weeks} weeks: a deposit, a borrow, a swap or a vote, from that wallet and no other.`,
      cost: `about ${usd(gas.weekly)} of gas a week`,
      time: `${cadence} minutes a week, ${weeks} weeks`,
    },
    {
      text: `Hold the ${usd(capital)} position for at least ${hold} days${age === null ? '' : `, the window a protocol ${Math.round((age ?? 0) / 30)} months old is still counted in`}, so more than one snapshot sees it.`,
      cost: `the ${usd(capital)} stays at risk in ${p.name}`,
      time: `${hold} days`,
    },
    {
      text: `A launch would put ${p.name} near ${low} to ${high} (the middle half of the cohort's spread around ${usd(p.tvl_usd)} of TVL): scale out a third of any allocation at the low end, and keep the rest through the first month of trading.`,
      cost: 'no fee to hold; a swap at the exit costs about $2',
      time: '30 minutes at the launch',
    },
    {
      text: `Claim only from a page ${p.name} itself publishes, and never connect the farm wallet to a link that asks for the seed phrase; write the wallet, the dates and every transaction into a farm log.`,
      cost: 'nothing, and never pay to claim',
      time: '10 minutes at the launch',
    },
  ];
  return steps;
}

// ---------------------------------------------------------------- the board

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, cal: Calibration): BoardRow[] {
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names is on the board, whatever else the model thinks.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other pre-token protocol the snapshot carries. The floor is never the
  // ceiling, and the protocols under it are the ones a radar exists to find first.
  for (const p of snapshot.protocols) if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);

  const watchlist = new Set(snapshot.watchlist);
  const scored = [...chosen.values()].map((p) => ({ p, age: ageDays(snapshot.as_of, p.listed_at), value: impliedValue(p, snapshot.as_of, cal) }));
  scored.sort((x, y) => y.value.implied - x.value.implied || (x.p.slug < y.p.slug ? -1 : x.p.slug > y.p.slug ? 1 : 0));
  return scored.map((s, i) => {
    const steps = farmSteps(s.p, s.age, s.value);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token' as const,
      age_days: s.age,
      on_watchlist: watchlist.has(s.p.slug),
      implied_value_usd: s.value.implied,
      band_low_usd: s.value.band_low,
      band_high_usd: s.value.band_high,
      model: {
        multiple: round6(s.value.multiple),
        growth_multiplier: round6(s.value.growth_multiplier),
        age_multiplier: round6(s.value.age_multiplier),
        growth_pct: s.value.growth_pct,
      },
      steps,
      farm_steps: steps.map(stepText),
    };
  });
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** The protocols whose token already trades: shown as the market's own figures, never ranked with the board. */
export function liveRows(snapshot: Snapshot, cal: Calibration, limit: number): LiveRow[] {
  const cohort = new Map(cal.cohort.map((c) => [c.slug, c]));
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || (a.slug < b.slug ? -1 : 1))
    .slice(0, limit)
    .map((p) => {
      const c = cohort.get(p.slug);
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        chains: p.chains,
        tvl_usd: p.tvl_usd,
        mcap_usd: p.mcap_usd,
        change_7d: p.change_7d,
        multiple: c === undefined ? null : round6(c.multiple),
      };
    });
}

/** A board row's compact form for data.js, with the farm plan's steps in their parts. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    on_watchlist: row.on_watchlist,
    implied_value_usd: row.implied_value_usd,
    band_low_usd: row.band_low_usd,
    band_high_usd: row.band_high_usd,
    multiple: row.model.multiple,
    growth_multiplier: row.model.growth_multiplier,
    age_multiplier: row.model.age_multiplier,
    steps: row.steps.map((s) => ({ text: s.text, cost: s.cost, time: s.time })),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, liveLimit: number): { board: BoardRow[]; radar: RadarData } {
  const cal = calibrate(snapshot);
  const board = buildBoard(snapshot, cal);
  const watchlist = new Set(snapshot.watchlist);
  const withToken = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const early = board.filter((r) => !watchlist.has(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    model: { growth_cap: GROWTH_CAP, age_cap: AGE_CAP, age_days_ref: AGE_DAYS_REF },
    counts: {
      protocols: snapshot.protocols.length,
      with_token: withToken,
      pre_token: snapshot.protocols.length - withToken,
      ranked: board.length,
      ranked_watchlist: board.length - early,
      watchlist: snapshot.watchlist.length,
      below_floor: snapshot.protocols.filter((p) => isRankable(p) && p.tvl_usd < snapshot.floor_usd).length,
      live_shown: 0,
    },
    calibration: cal,
    rows: board.map(radarRow),
    live: [],
  };
  radar.live = liveRows(snapshot, cal, liveLimit);
  radar.counts.live_shown = radar.live.length;
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return { as_of: o.as_of, source: o.source, floor_usd: o.floor_usd, protocols, watchlist: o.watchlist as string[] };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared value, farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  if (board.length < 100 || board.length > 4000) return `the board holds ${board.length} rows, outside the 100 to 4000 the gate takes`;
  const known = new Set(snapshot.protocols.map((p) => p.slug));
  for (const r of board) if (!known.has(r.slug)) return `${r.slug} is not one of the snapshot's protocols`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12) return `${r.slug} has ${r.farm_steps.length} farm steps`;
    for (const s of r.farm_steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 100_000_000_000_000) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
