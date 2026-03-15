import { doProcessLayoutFile, processLayout } from "@utils/processLayout";

/**
 * Process an MSFS package directory to generate/update layout.json (simple API).
 *
 * This is a convenience wrapper around {@link processLayout} that uses default
 * options and throws on errors. For more control, use {@link processLayout} directly.
 *
 * @param packageDir - Path to the MSFS package directory (must contain manifest.json)
 * @returns Promise that resolves when layout.json has been generated
 *
 * @throws {Error} If package directory doesn't exist or doesn't contain manifest.json
 * @throws {Error} If no valid files are found in the package
 *
 * @example
 * // Basic usage
 * await generateLayout("F:\\fs20\\Community\\my-package");
 *
 * @example
 * // With error handling
 * try {
 *   await generateLayout("./my-package");
 *   console.log("Layout generated successfully");
 * } catch (error) {
 *   console.error("Failed:", error.message);
 * }
 */
export const generateLayout = doProcessLayoutFile;

export { processLayout };
export type { Content, Layout, Manifest, ProcessOptions, ProcessResult } from "@/types";
