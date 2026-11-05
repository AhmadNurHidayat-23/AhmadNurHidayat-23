import fs from 'node:fs/promises';

const login = 'AhmadNurHidayat-23';
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('Set GH_TOKEN or GITHUB_TOKEN to query GitHub contributions.');
const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Ahmad-Profile-Motion',
  },
  body: JSON.stringify({
    query: `query($login:String!) { user(login:$login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel weekday } } } } } }`,
    variables: { login },
  }),
});
if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
const result = await response.json();
if (result.errors) throw new Error(result.errors.map(error => error.message).join('; '));
const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar?.weeks?.length || !Number.isInteger(calendar.totalContributions)) {
  throw new Error('GitHub returned an incomplete calendar. Existing assets will be preserved.');
}
const sum = calendar.weeks.flatMap(week => week.contributionDays)
  .reduce((total, day) => total + day.contributionCount, 0);
if (sum !== calendar.totalContributions) throw new Error('Calendar total does not match the daily data.');
await fs.writeFile(new URL('./data/activity.json', import.meta.url), JSON.stringify({
  login,
  fetchedAt: new Date().toISOString(),
  source: 'https://docs.github.com/en/graphql/reference/objects#contributioncalendar',
  ...calendar,
}, null, 2) + '\n');
console.log(`Fetched ${calendar.totalContributions} real contributions across ${calendar.weeks.length} weeks.`);
