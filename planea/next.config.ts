import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// La app vive en planea/ dentro del repositorio, que tiene su propio
// package-lock.json en la raíz. Sin esto Next infiere la raíz del repositorio
// como raíz del proyecto y el bundler no resuelve los módulos correctamente.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
