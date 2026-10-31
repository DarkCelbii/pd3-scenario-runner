import { readFile, stat } from 'node:fs/promises';
import { runScenario, MAX_SCENARIO_BYTES } from './runner.mjs';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: npm start -- [--scenario path/to/scenario.json]');
  console.log('Runs a temporary local realm and prints JSON results. Exit code: 0 pass, 1 failure.');
} else {
  try {
    if (!(args.length === 0 || (args.length === 2 && args[0] === '--scenario'))) {
      throw new Error('Use --help, or --scenario followed by a JSON file path.');
    }
    const path = args[1] ?? new URL('../examples/smoke.json', import.meta.url);
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.size > MAX_SCENARIO_BYTES) {
      throw new Error('Scenario must be a JSON file of at most 65536 bytes.');
    }
    const content = await readFile(path, 'utf8');
    if (Buffer.byteLength(content) > MAX_SCENARIO_BYTES) throw new Error('Scenario exceeds 65536 bytes.');
    const scenario = JSON.parse(content);
    const report = await runScenario(scenario);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.success ? 0 : 1;
  } catch (error) {
    console.error(`Scenario failed: ${error.message}`);
    process.exitCode = 1;
  }
}
