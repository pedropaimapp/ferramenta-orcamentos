import type { NextConfig } from 'next';
import fs from 'node:fs';
import path from 'node:path';

// scripts/render-orcamento-pdf.mjs is spawned via child_process from the PDF
// route (see that route's file for why: Next's App Router bundling is
// incompatible with @react-pdf/renderer's React 18 reconciler). Because it's
// only ever referenced as a runtime path string — never `import`ed/`require`d —
// Vercel's build-time file tracer can't see it or its dependencies, so without
// help the deployed function is missing @react-pdf/renderer entirely and every
// PDF download fails with "Cannot find package" in production.
//
// This walks @react-pdf/renderer's and react's real dependency tree in
// node_modules (same algorithm npm itself uses to flatten deps) so the include
// list below can never drift out of sync with what's actually installed.
function dependencyClosure(rootPackages: string[]): string[] {
  const seen = new Set<string>();
  const queue = [...rootPackages];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (seen.has(name)) continue;
    seen.add(name);
    const pkgJsonPath = path.join(process.cwd(), 'node_modules', name, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as { dependencies?: Record<string, string> };
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
  return [...seen];
}

const pdfScriptDependencies = dependencyClosure(['react', '@react-pdf/renderer']).map(
  (pkg) => `./node_modules/${pkg}/**`
);

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/orcamentos/[id]/pdf/**': ['./scripts/render-orcamento-pdf.mjs', ...pdfScriptDependencies],
  },
};

export default nextConfig;
