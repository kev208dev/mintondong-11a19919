import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

// Vite exposes .env files through import.meta.env, but server-only modules use
// process.env so that secrets can never be bundled for the browser. Load only
// local, gitignored files into the dev process before starting Vite.
const envFile = [".env.local", ".dev.vars"].find((file) => existsSync(resolve(file)));

if (envFile) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.trim().replace(/^("|')(.*)\1$/u, "$2");
    process.env[key] = value;
  }
}

const viteBin = resolve("node_modules/vite/bin/vite.js");
const child = spawn(process.execPath, [viteBin, "dev", ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
