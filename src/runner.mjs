import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createRealmServer, MAX_CHARACTERS } from 'project-diablo-3';

export const MAX_SCENARIO_BYTES = 65536;
const PATHS = new Set(['/health', '/api/realm', '/api/characters']);
const METHODS = new Set(['GET', 'POST', 'DELETE']);
const STEP_FIELDS = new Set(['label', 'method', 'path', 'authenticated', 'body', 'expectStatus', 'expectCharacterCount']);

function validateScenario(scenario) {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)
    || Object.keys(scenario).some(key => !['name', 'steps'].includes(key))
    || typeof scenario.name !== 'string' || scenario.name.length < 1 || scenario.name.length > 120
    || !Array.isArray(scenario.steps) || scenario.steps.length < 1 || scenario.steps.length > 32) {
    throw new Error('A scenario needs a name (1-120 characters) and 1-32 steps.');
  }
  if (Buffer.byteLength(JSON.stringify(scenario)) > MAX_SCENARIO_BYTES) {
    throw new Error('Scenario exceeds 65536 bytes.');
  }
  for (const step of scenario.steps) {
    if (!step || typeof step !== 'object' || Array.isArray(step)
      || Object.keys(step).some(key => !STEP_FIELDS.has(key))
      || !PATHS.has(step.path) || !METHODS.has(step.method ?? 'GET')
      || !Number.isInteger(step.expectStatus) || step.expectStatus < 100 || step.expectStatus > 599
      || (step.label !== undefined && (typeof step.label !== 'string' || step.label.length > 80))
      || (step.authenticated !== undefined && typeof step.authenticated !== 'boolean')
      || ((step.method ?? 'GET') !== 'POST' && step.body !== undefined)
      || (step.expectCharacterCount !== undefined && (!Number.isInteger(step.expectCharacterCount)
        || step.expectCharacterCount < 0 || step.expectCharacterCount > MAX_CHARACTERS))) {
      throw new Error('Invalid scenario step: check route, method, expectations and field names.');
    }
  }
}

/** Exercise the installed Project Diablo 3 dependency in a temporary local realm. */
export async function runScenario(scenario) {
  validateScenario(scenario);
  const token = randomBytes(32).toString('base64url');
  const server = createRealmServer({ token });
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const results = [];
    for (const step of scenario.steps) {
      const method = step.method ?? 'GET';
      const headers = {};
      if (step.authenticated !== false) headers.Authorization = `Bearer ${token}`;
      if (method === 'POST') headers['Content-Type'] = 'application/json';
      const response = await fetch(`${base}${step.path}`, {
        method, headers, redirect: 'error', signal: AbortSignal.timeout(3000),
        ...(step.body !== undefined ? { body: JSON.stringify(step.body) } : {}),
      });
      const payload = await response.json();
      const countMatches = step.expectCharacterCount === undefined
        || (Array.isArray(payload.characters) && payload.characters.length === step.expectCharacterCount);
      results.push({
        label: step.label ?? `${method} ${step.path}`,
        method, path: step.path, expectedStatus: step.expectStatus, actualStatus: response.status,
        ...(step.expectCharacterCount !== undefined ? { expectedCharacterCount: step.expectCharacterCount } : {}),
        passed: response.status === step.expectStatus && countMatches,
        response: payload,
      });
    }
    const passed = results.filter(result => result.passed).length;
    return { scenario: scenario.name, success: passed === results.length, passed, failed: results.length - passed, results };
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    }
  }
}
