import { join } from "node:path";

/**
 * Realtime's stand-in for the Plugin's scripts/lib/pluginPackage: the Plugin package's assets, FreeCAD worker and
 * Chinese Writing Pack live in presence-assets/ here (see presence-assets/README.md).
 */
export const REPO_ROOT = join(import.meta.dirname, "..", "..");
export const PLUGIN_ROOT = join(REPO_ROOT, "presence-assets");
