import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const protocol = resolve(process.argv[2]);
const surfaces = new Map([
  ["request", "ClientRequest.ts"],
  ["requestRaw", "ClientRequest.ts"],
  ["notify", "ClientNotification.ts"],
  ["onNotification", "ServerNotificationEnvelope.ts"],
  ["onReverseRequest", "ServerRequest.ts"],
]);
const supported = new Map();
for (const file of new Set(surfaces.values())) {
  const methods = new Set();
  const source = ts.createSourceFile(file, readFileSync(join(protocol, file), "utf8"), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isPropertySignature(node) && node.name?.getText(source).replaceAll('"', '') === "method"
      && node.type && ts.isLiteralTypeNode(node.type) && ts.isStringLiteral(node.type.literal)) {
      methods.add(node.type.literal.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  supported.set(file, methods);
}

let checked = 0;
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "generated") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { scan(path); continue; }
    if (!/\.tsx?$/.test(entry.name) || /\.(test|spec)\./.test(entry.name)) continue;
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const file = surfaces.get(node.expression.name.text);
        const argument = node.arguments[0];
        if (file && argument && ts.isStringLiteral(argument)) {
          const method = argument.text;
          // This lifecycle event is emitted by the Tauri transport, not Core.
          if (!(file === "ServerNotificationEnvelope.ts" && method === "app-server/stopped")) {
            if (!supported.get(file).has(method)) throw new Error(`Missing ${file} method ${method}, consumed by ${path}`);
            checked++;
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
scan(join(root, "src"));
console.log(`Protocol surface passed: ${checked} literal RPC calls and subscriptions.`);
