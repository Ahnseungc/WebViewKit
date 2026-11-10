// `/svelte` 배포물: .svelte 는 원본 그대로(앱의 Svelte 컴파일러가 컴파일), .ts 는 JS 로만 변환한다.
// `../core.js` 는 tsup 이 만든 `../core.mjs` 를 가리키게 바꾼다.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { transformSync } from "esbuild";

const SRC = "src/svelte";
const OUT = "dist/svelte";
const TYPES_TMP = "dist/.svelte-types";
const CORE_IMPORT = /(["'])\.\.\/core\.js\1/g;
const toDist = (code) => code.replace(CORE_IMPORT, '"../core.mjs"');
const toDistTypes = (code) => code.replace(CORE_IMPORT, '"../core.js"');

/** 컴포넌트 props 타입 (svelte-check·IDE 가 `X.svelte.d.ts` 를 읽는다) */
const COMPONENT_TYPES = {
  "StackRouter.svelte": [
    "StackRouterProps",
    'import type { StackRouterProps } from "./types.js";',
  ],
  "StackHeader.svelte": ["{ title?: string; children?: Snippet }", ""],
  "BackRouter.svelte": ["{ label?: string }", ""],
  "StackPage.svelte": ["Record<string, unknown>", ""],
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC)) {
  // __tests__ 등 하위 폴더는 배포하지 않는다
  if (statSync(join(SRC, file)).isDirectory()) continue;
  const code = readFileSync(join(SRC, file), "utf8");
  if (file.endsWith(".svelte")) {
    writeFileSync(join(OUT, file), toDist(code));
    const [props, extraImport] = COMPONENT_TYPES[file];
    const name = file.replace(".svelte", "");
    writeFileSync(
      join(OUT, `${file}.d.ts`),
      `import type { Component, Snippet } from "svelte";\n${extraImport}\ndeclare const ${name}: Component<${props}>;\nexport default ${name};\n`
    );
  } else if (file.endsWith(".ts")) {
    const { code: js } = transformSync(code, {
      loader: "ts",
      format: "esm",
      target: "es2020",
    });
    writeFileSync(join(OUT, file.replace(/\.ts$/, ".js")), toDist(js));
  }
}

// context·types·index 의 d.ts (.svelte import 는 위에서 만든 X.svelte.d.ts 로 풀린다)
writeFileSync(
  join(OUT, "svelte-shim.d.ts"),
  'declare module "*.svelte" { const component: import("svelte").Component; export default component; }\n'
);
execFileSync(
  "pnpm",
  [
    "exec",
    "tsc",
    "--declaration",
    "--emitDeclarationOnly",
    "--skipLibCheck",
    "--module",
    "esnext",
    "--moduleResolution",
    "bundler",
    "--target",
    "es2020",
    "--lib",
    "dom,es2020",
    "--types",
    "node",
    "--strict",
    "--rootDir",
    "src",
    "--outDir",
    TYPES_TMP,
    join(OUT, "svelte-shim.d.ts"),
    join(SRC, "index.ts"),
  ],
  { stdio: "inherit" }
);
rmSync(join(OUT, "svelte-shim.d.ts"));
for (const file of readdirSync(join(TYPES_TMP, "svelte"))) {
  const code = readFileSync(join(TYPES_TMP, "svelte", file), "utf8");
  writeFileSync(join(OUT, file), toDistTypes(code));
}
rmSync(TYPES_TMP, { recursive: true, force: true });
console.log(`svelte: ${readdirSync(OUT).join(", ")}`);
