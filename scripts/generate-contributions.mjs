import { writeFileSync, mkdirSync } from 'node:fs';

const { GH_PAT, GH_USER } = process.env;

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount weekday }
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
const weeks = cal.weeks;

// --- SVG layout ---
const cell = 12;
const gap = 3;
const padX = 24;
const padY = 64;
const width = padX * 2 + weeks.length * (cell + gap);
const height = padY + 7 * (cell + gap) + 24;

// Indigo scale matching your portfolio (bg #08080F, accent #6366F1)
const colorFor = (c) => {
  if (c === 0) return '#1a1a2e';
  if (c < 3)   return '#312e81';
  if (c < 6)   return '#4338ca';
  if (c < 10)  return '#6366f1';
  return '#a5b4fc';
};

let cells = '';
weeks.forEach((w, x) => {
  w.contributionDays.forEach((d) => {
    const cx = padX + x * (cell + gap);
    const cy = padY + d.weekday * (cell + gap);
    cells += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="2" fill="${colorFor(d.contributionCount)}"/>`;
  });
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#08080F"/>
  <text x="${padX}" y="28" font-family="'Space Grotesk', sans-serif" font-size="16" font-weight="600" fill="#A5B4FC">${total.toLocaleString()} contributions in the last year</text>
  <text x="${padX}" y="48" font-family="'JetBrains Mono', monospace" font-size="11" fill="#6B7280">Includes private repositories — repo names not exposed</text>
  ${cells}
</svg>`;

mkdirSync('assets', { recursive: true });
writeFileSync('assets/contributions.svg', svg);
console.log(`Wrote assets/contributions.svg — ${total} contributions`);
