import { resolveKickChannel } from "../lib/kickResolver.js";

const slug = process.argv[2] || "xqc";
console.log(`Resolviendo "${slug}"…`);
const t0 = Date.now();
try {
  const info = await resolveKickChannel(slug);
  console.log(`OK (${Date.now() - t0}ms):`, info);
} catch (err) {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
}
process.exit();
