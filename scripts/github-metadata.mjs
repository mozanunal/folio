import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const { description, homepage, keywords, repository } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const repositoryUrl = repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const argumentsList = ['repo', 'edit', repositoryUrl, '--description', description, '--homepage', homepage];
for (const keyword of keywords) argumentsList.push('--add-topic', keyword);
const result = spawnSync('gh', argumentsList, { stdio: 'inherit' });
if (result.error) console.error(`GitHub CLI is required: ${result.error.message}`);
process.exit(result.status ?? 1);
