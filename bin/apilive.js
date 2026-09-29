#!/usr/bin/env node
import { main } from "../src/cli.js";

const [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  console.error(`apilive needs Node.js 18 or newer (you have ${process.versions.node}).`);
  process.exit(2);
}

main(process.argv.slice(2)).then(
  // exitCode (not exit()) lets pending sockets close cleanly — avoids a libuv
  // assertion on Windows when exiting mid-teardown.
  (code) => {
    process.exitCode = code ?? 0;
  },
  (e) => {
    console.error(e?.stack || e);
    process.exit(1);
  },
);
