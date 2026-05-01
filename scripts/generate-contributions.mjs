import { writeFileSync, mkdirSync } from 'node:fs';

const { GH_PAT, GH_USER } = process.env;

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount }
          }
        }
      }
    }
  }
`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${GH_PAT}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, variables: { login: GH_USER } }),
});

if (!res.ok) {
  console.error('GraphQL failed:', res.status, await res.text());
  process.exit(1);
}

const json = await res.json();
const cal = json.data.user.contributionsCollection.contributionCalendar;
const total = cal.totalContributions;
const days = cal.weeks.flatMap((w) => w.contributionDays);

// --- Layout ---
const W = 1200;
const H = 400;
const padL = 60;
const padR = 40;
const padT = 90;
const padB = 60;
const chartW = W - padL - padR;
const chartH = H - padT - padB;

// --- Scales ---
const maxC = Math.max(...days.map((d) => d.contributionCount), 1);
const xFor = (i) => padL + (i / (days.length - 1)) * chartW;
const yFor = (c) => padT + chartH - (c / maxC) * chartH;

const points = days.map((d, i) => [xFor(i), yFor(d.contributionCount)]);

// Catmull-Rom -> cubic Bezier for a smooth curve
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let p = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    p += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return p;
}

const linePath = smoothPath(points);
const baseY = (padT + chartH).toFixed(2);
const areaPath = `${linePath} L ${xFor(days.length - 1).toFixed(2)} ${baseY} L ${xFor(0).toFixed(2)} ${baseY} Z`;

// Approximate path length for stroke-dasharray draw-in animation
let pathLen = 0;
for (let i = 1; i < points.length; i++) {
  const dx = points[i][0] - points[i - 1][0];
  const dy = points[i][1] - points[i - 1][1];
  pathLen += Math.sqrt(dx * dx + dy * dy);
}
pathLen = Math.ceil(pathLen * 1.15);

// --- Y-axis ticks ---
const tickCount = 4;
const ticks = [];
for (let i = 0; i <= tickCount; i++) {
  ticks.push(Math.round((maxC / tickCount) * i));
}

// --- Month labels along X-axis ---
const months = [];
let lastMonth = -1;
days.forEach((d, i) => {
  const m = new Date(d.date).getUTCMonth();
  if (m !== lastMonth) {
    months.push({
      x: xFor(i),
      label: new Date(d.date).toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
    });
    lastMonth = m;
  }
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Contribution graph: ${total} contributions in the last year">
  <defs>
    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="#08080F" rx="8"/>

  <text x="${padL}" y="42" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="#A5B4FC">${total.toLocaleString()} contributions in the last year</text>
  <text x="${padL}" y="66" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="12" fill="#6B7280">Includes private repositories — repo names not exposed</text>

  ${ticks
    .map((v) => {
      const y = padT + chartH - (v / maxC) * chartH;
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#1F1F2E" stroke-width="1" stroke-dasharray="2,4"/>
    <text x="${padL - 10}" y="${y + 4}" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="10" fill="#4B5563" text-anchor="end">${v}</text>`;
    })
    .join('\n  ')}

  ${months
    .map(
      (m) =>
        `<text x="${m.x.toFixed(2)}" y="${H - padB + 26}" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="10" fill="#6B7280" text-anchor="middle">${m.label}</text>`
    )
    .join('\n  ')}

  <path d="${areaPath}" fill="url(#areaGrad)" opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.2s" dur="1s" fill="freeze"/>
  </path>

  <path d="${linePath}" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="${pathLen}" stroke-dashoffset="${pathLen}">
    <animate attributeName="stroke-dashoffset" from="${pathLen}" to="0" dur="2.5s" fill="freeze"/>
  </path>
</svg>`;

mkdirSync('assets', { recursive: true });
writeFileSync('assets/contributions.svg', svg);
console.log(`Wrote assets/contributions.svg — ${total} contributions across ${days.length} days`);
