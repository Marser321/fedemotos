#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const baseUrl = process.env.E2E_STAGING_BASE_URL;

if (!baseUrl) {
  console.error("E2E_STAGING_BASE_URL es obligatorio para test:release:staging");
  process.exit(1);
}

const commands = [
  ["npm", ["run", "env:validate:profiles"]],
  ["npm", ["run", "lint"]],
  ["npm", ["run", "test"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "help:capture:staging"]],
  ["npm", ["run", "test:e2e:staging"]],
  ["npm", ["run", "test:db:staging"]],
  ["npm", ["run", "test:smoke"]],
];

for (const [cmd, args] of commands) {
  const label = `${cmd} ${args.join(" ")}`;
  console.log(`\n> ${label}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      SMOKE_BASE_URL: process.env.SMOKE_BASE_URL || baseUrl,
    },
  });

  if (result.status !== 0) {
    console.error(`\nRelease staging bloqueado por falla en: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nRelease staging checks OK");
