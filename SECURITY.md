# Security

**David Gibb (celbii / [DarkCelbii](https://github.com/DarkCelbii))** is the
creator and security maintainer of this first-party development tool.

Each run uses an isolated Project Diablo 3 server bound to `127.0.0.1` on an
operating-system-assigned port. The runner creates a fresh random bearer token
internally. Reports omit request authorization headers and the token.

Scenarios are JSON data. Allowed routes and methods are bounded; external URLs,
unknown step fields and redirects are rejected. Runs accept up to 32 steps,
with a three-second request timeout. The dependency is pinned by commit.

This prototype is for local development. It uses the core project's temporary
shared-token realm, with no multi-user account system or game-client protocol.
Treat custom scenario inputs and generated reports as local development data.

A private vulnerability reporting channel has not yet been configured. Do not
post tokens, personal data or undisclosed vulnerability details in public issues.
No independent security audit or production support is claimed.
