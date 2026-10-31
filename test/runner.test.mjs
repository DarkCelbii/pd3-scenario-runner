import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { MAX_SCENARIO_BYTES, runScenario } from '../src/runner.mjs';

const example = JSON.parse(await readFile(new URL('../examples/smoke.json', import.meta.url), 'utf8'));
const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
const invoke = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 10000, windowsHide: true });

test('the installed dependency executes the full example against a real local realm', async () => {
  const report = await runScenario(example);
  assert.equal(report.success, true);
  assert.equal(report.passed, 8);
  assert.equal(report.failed, 0);
  const characters = report.results.at(-1).response.characters;
  assert.equal(characters.length, 1);
  assert.equal(characters[0].name, 'Aidan');
  assert.equal(characters[0].level, 1);
  assert.ok(!JSON.stringify(report).includes('Bearer '));
});

test('mismatched status and character-count expectations are reported as failures', async () => {
  const report = await runScenario({ name: 'Mismatch', steps: [
    { path: '/health', expectStatus: 201 },
    { path: '/api/characters', expectStatus: 200, expectCharacterCount: 1 },
  ] });
  assert.equal(report.success, false);
  assert.equal(report.failed, 2);
  assert.equal(report.results[0].actualStatus, 200);
});

test('separate scenario runs get independent temporary state', async () => {
  assert.equal((await runScenario(example)).success, true);
  assert.equal((await runScenario(example)).success, true);
});

test('scenario validation rejects external URLs, unknown options and unbounded runs', async () => {
  for (const path of ['https://example.com', '//example.com', '/api/characters?redirect=elsewhere']) {
    await assert.rejects(runScenario({ name: 'Invalid', steps: [{ path, expectStatus: 200 }] }), /Invalid scenario step/);
  }
  await assert.rejects(runScenario({ name: 'Invalid', steps: [{ path: '/health', expectStatus: 200, headers: {} }] }), /Invalid scenario step/);
  await assert.rejects(runScenario({ name: 'Too many', steps: Array(33).fill({ path: '/health', expectStatus: 200 }) }), /1-32 steps/);
});

test('CLI prints a real JSON report and exits successfully for the default scenario', () => {
  const child = invoke([]);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).passed, 8);
  assert.equal(child.stderr, '');
});

test('CLI returns a failing exit code for observed expectation failures', () => {
  const child = invoke(['--scenario', fileURLToPath(new URL('./fixtures/mismatch.json', import.meta.url))]);
  assert.equal(child.status, 1, child.stderr);
  assert.equal(JSON.parse(child.stdout).success, false);
});

test('CLI rejects oversized scenario files and invalid arguments', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pd3-scenario-test-'));
  const path = join(directory, 'oversized.json');
  try {
    await writeFile(path, ' '.repeat(MAX_SCENARIO_BYTES + 1));
    const child = invoke(['--scenario', path]);
    assert.equal(child.status, 1);
    assert.match(child.stderr, /65536 bytes/);
    assert.equal(invoke(['--unknown']).status, 1);
    assert.equal(invoke(['--help']).status, 0);
  } finally {
    await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory);
  }
});
