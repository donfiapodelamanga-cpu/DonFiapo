/**
 * Spin Wheel Simulation
 * Usage: npx ts-node scripts/spin-simulation.ts
 */

const PRIZE_TABLE = [
  { i: 0,  name: "10K FIAPO",      w: 2,    cap: 1,  cost: 0.10 },
  { i: 1,  name: "5K FIAPO",       w: 5,    cap: 1,  cost: 0.05 },
  { i: 2,  name: "0.5 FIAPO",      w: 1800, cap: 0,  cost: 0.000005 },
  { i: 3,  name: "2 USDT",         w: 15,   cap: 2,  cost: 2.00 },
  { i: 4,  name: "500 FIAPO",      w: 50,   cap: 5,  cost: 0.005 },
  { i: 5,  name: "0.5 FIAPO",      w: 1800, cap: 0,  cost: 0.000005 },
  { i: 6,  name: "0.50 USDT",      w: 100,  cap: 10, cost: 0.50 },
  { i: 7,  name: "5h BOOST",       w: 1500, cap: 0,  cost: 0.00 },
  { i: 8,  name: "0.5 FIAPO",      w: 1800, cap: 0,  cost: 0.000005 },
  { i: 9,  name: "50 FIAPO",       w: 400,  cap: 30, cost: 0.0005 },
  { i: 10, name: "0.5 FIAPO",      w: 528,  cap: 0,  cost: 0.000005 },
  { i: 11, name: "MISS",           w: 2000, cap: 0,  cost: 0.00 },
];

const TW = PRIZE_TABLE.reduce((s, p) => s + p.w, 0);
const PRICE = 0.07;

function sim(total: number, perDay: number) {
  const hits = new Array(12).fill(0);
  let cost = 0, today = 0;
  let caps = new Map<number, number>();

  for (let s = 0; s < total; s++) {
    if (today >= perDay) { today = 0; caps = new Map(); }
    let prize = PRIZE_TABLE[11];
    for (let a = 0; a < 20; a++) {
      const roll = Math.floor(Math.random() * TW);
      let acc = 0;
      for (const p of PRIZE_TABLE) {
        acc += p.w;
        if (roll < acc) {
          if (p.cap === 0 || (caps.get(p.i) ?? 0) < p.cap) { prize = p; break; }
          break;
        }
      }
      if (prize !== PRIZE_TABLE[11] || a === 19) break;
    }
    hits[prize.i]++;
    cost += prize.cost;
    if (prize.cap > 0) caps.set(prize.i, (caps.get(prize.i) ?? 0) + 1);
    today++;
  }
  return { hits, cost, rev: total * PRICE, days: Math.ceil(total / perDay) };
}

function run(label: string, total: number, perDay: number) {
  const r = sim(total, perDay);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${label} — ${total.toLocaleString()} spins | ${perDay}/dia | ~${r.days} dias`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  ${'Premio'.padEnd(18)} ${'Hits'.padStart(7)} ${'Real%'.padStart(7)} ${'Peso%'.padStart(7)} ${'Custo$'.padStart(10)}`);
  console.log(`  ${'-'.repeat(52)}`);
  for (const p of PRIZE_TABLE) {
    const h = r.hits[p.i];
    const pct = ((h / total) * 100).toFixed(2);
    const exp = ((p.w / TW) * 100).toFixed(2);
    const c = (h * p.cost).toFixed(4);
    console.log(`  ${p.name.padEnd(18)} ${String(h).padStart(7)} ${pct.padStart(6)}% ${exp.padStart(6)}% $${c.padStart(9)}`);
  }
  console.log(`  ${'-'.repeat(52)}`);
  console.log(`  Receita total:  $${r.rev.toFixed(2)}`);
  console.log(`  Custo total:    $${r.cost.toFixed(4)}`);
  console.log(`  Lucro:          $${(r.rev - r.cost).toFixed(2)} (${(((r.rev - r.cost) / r.rev) * 100).toFixed(1)}% margem)`);
  console.log(`  EV/spin:        $${(r.cost / total).toFixed(6)}`);
  console.log(`  Custo/dia:      $${(r.cost / r.days).toFixed(4)}`);
}

run("10K spins (cenário pequeno)", 10_000, 500);
run("50K spins (cenário médio)", 50_000, 1000);
run("100K spins (cenário alto)", 100_000, 2000);
