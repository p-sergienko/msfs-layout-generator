import { doProcessLayoutFile } from "@utils/processLayout";

/**
 * Process an MSFS package directory to generate/update layout.json
 *
 * This function scans all files in the package directory, creates a layout.json
 * with file metadata, and updates the total_package_size in manifest.json.
 *
 * @param packageDir - Path to the MSFS package directory (must contain manifest.json)
 * @returns Promise that resolves when layout.json has been generated
 *
 * @throws {Error} If package directory doesn't exist or doesn't contain manifest.json
 * @throws {Error} If no valid files are found in the package
 *
 * @example
 * // Basic usage
 * await doProcessLayoutFile("F:\\fs20\\Community\\my-package");
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
export type { ProcessOptions, ProcessResult } from "@/index.d";