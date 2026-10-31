# PD3 Scenario Runner

A development tool for testing the Project Diablo 3 realm API. Maintained by
**David Gibb (celbii / [DarkCelbii](https://github.com/DarkCelbii))**.

The runner installs [Project Diablo 3](https://github.com/DarkCelbii/project-diablo-3)
as a real Git dependency, imports its `createRealmServer` function and starts a
temporary loopback realm. It sends HTTP requests described by a JSON scenario,
compares observed responses with expectations, prints a JSON report and stops
the server. Character state and the randomly generated token are discarded.

## Run

Requires Node.js 24 or newer and Git. The initial installation downloads the
pinned public Git dependency.

```sh
npm ci --ignore-scripts
npm start
npm test
```

The default scenario checks health, realm discovery, an empty character list,
authentication, successful creation, duplicate-name handling, invalid classes
and the final character count. Exit code 0 means every expectation passed;
exit code 1 means an expectation or execution failed.

## Custom scenarios

```sh
npm start -- --scenario examples/smoke.json
node src/cli.mjs --scenario examples/smoke.json > report.json
```

Start from [examples/smoke.json](examples/smoke.json). A scenario has a `name`
and 1-32 `steps`. Each step uses one of `/health`, `/api/realm` or
`/api/characters`, and supplies `expectStatus`. Optional fields are `label`,
`method` (`GET`, `POST` or `DELETE`), `authenticated` (default true), `body`
(POST only), and `expectCharacterCount`. Scenario files are limited to 64 KiB.
Reports contain observed results; tokens and authorization headers are omitted.

## Dependency and ownership

- [package.json](package.json) declares the core Git dependency at an exact commit.
- [package-lock.json](package-lock.json) records the resolved installation.
- [src/runner.mjs](src/runner.mjs) imports and executes the installed core package.
- The runner tests exercise that installed dependency; there is no copied server
  implementation or local-source fallback.

Both repositories are owned and maintained by David Gibb. This is **first-party
development use**. If citing this dependency as evidence, disclose the common
ownership. It does not establish adoption by other developers, and no aggregate
GitHub Dependents count or application eligibility is claimed.

## License

[MIT](LICENSE). See [SECURITY.md](SECURITY.md) for the security contact and limits.
