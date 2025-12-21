import * as path from "node:path";
import type { Layout, Content } from "@/index.d";
import { getAllFiles } from "@utils/getAllFiles";
import { doExcludeFile } from "@utils/doExcludeFile";
import { stat, writeFile, constants, access } from "fs/promises";
import { getWindowsFileTime } from "@utils/getWindowsFileTime";
import { doUpdateManifest } from "@utils/doUpdateManifest";

export interface ProcessOptions {
    force?: boolean;
    quiet?: boolean;
    debug?: boolean;
    checkManifest?: boolean;
    skipManifestUpdate?: boolean;
}

export interface ProcessResult {
    fileCount: number;
    totalSize: number;
    layoutPath: string;
    manifestPath: string;
    skippedFiles: number;
    success: boolean;
    message?: string;
}

export const doProcessLayoutFileCli = async (
    packageDir: string,
    options: ProcessOptions = {}
): Promise<ProcessResult> => {
    const {
        force = false,
        quiet = false,
        debug = false,
        checkManifest = true,
        skipManifestUpdate = false
    } = options;

    const layoutPathFile = path.join(packageDir, 'layout.json');
    const manifestPath = path.join(packageDir, 'manifest.json');

    // Validate input directory exists
    try {
        await access(packageDir, constants.F_OK);
    } catch {
        return {
            fileCount: 0,
            totalSize: 0,
            layoutPath: layoutPathFile,
            manifestPath,
            skippedFiles: 0,
            success: false,
            message: `Directory does not exist: ${packageDir}`
        };
    }

    // Check for manifest.json if required
    if (checkManifest) {
        try {
            await access(manifestPath, constants.F_OK);
        } catch {
            return {
                fileCount: 0,
                totalSize: 0,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: 0,
                success: false,
                message: `manifest.json not found in ${packageDir}`
            };
        }
    }

    // Check if layout.json already exists
    try {
        await access(layoutPathFile, constants.F_OK);
        if (!force) {
            return {
                fileCount: 0,
                totalSize: 0,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: 0,
                success: false,
                message: `layout.json already exists. Use --force to overwrite.`
            };
        }
        if (debug && !quiet) {
            console.log(`Debug: layout.json exists, will overwrite due to --force flag`);
        }
    } catch {
        // layout.json doesn't exist, that's fine
        if (debug && !quiet) {
            console.log(`Debug: No existing layout.json found, creating new one`);
        }
    }

    let totalPackageSize = 0;
    const layout: Layout = { content: [] };
    let hasLongPath = false;
    let excludedCount = 0;

    try {
        const allFiles = await getAllFiles(packageDir);

        if (debug && !quiet) {
            console.log(`Debug: Found ${allFiles.length} total files in ${packageDir}`);
        }

        if (allFiles.length === 0) {
            return {
                fileCount: 0,
                totalSize: 0,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: 0,
                success: false,
                message: 'No files found in package directory'
            };
        }

        for (const file of allFiles) {
            // Check for long file paths (Windows limitation)
            if (file.length > 259) {
                hasLongPath = true;
                if (debug && !quiet) {
                    console.log(`Debug: Skipping long path: ${file}`);
                }
                continue;
            }

            const relativePath = path.relative(packageDir, file).split(path.sep).join('/');
            const isExcluded = doExcludeFile(relativePath);

            try {
                const stats = await stat(file);
                totalPackageSize += stats.size;

                if (isExcluded) {
                    excludedCount++;
                    if (debug && !quiet) {
                        console.log(`Debug: Excluding file: ${relativePath}`);
                    }
                    continue;
                }

                const content: Content = {
                    path: relativePath,
                    size: stats.size,
                    date: getWindowsFileTime(stats.mtime)
                };

                layout.content.push(content);

            } catch (error: any) {
                if (debug && !quiet) {
                    console.log(`Debug: Error processing file ${file}: ${error.message}`);
                }
                excludedCount++;
            }
        }

        if (hasLongPath && !quiet) {
            console.log(`Warning: One or more file paths exceed 259 characters and were skipped.`);
        }

        if (layout.content.length === 0) {
            return {
                fileCount: 0,
                totalSize: 0,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: excludedCount,
                success: false,
                message: 'No valid files to include in layout.json'
            };
        }

        // Sort content by path for consistent output
        layout.content.sort((a, b) => a.path.localeCompare(b.path));

        // Write layout.json with LF line endings
        const json = JSON.stringify(layout, null, 2).replace(/\r\n/g, '\n');
        await writeFile(layoutPathFile, json, 'utf8');

        // Add layout.json size to total
        const layoutStats = await stat(layoutPathFile);
        totalPackageSize += layoutStats.size;

        // Update manifest.json if it exists and not skipped
        if (!skipManifestUpdate) {
            try {
                await access(manifestPath, constants.F_OK);
                await doUpdateManifest(manifestPath, totalPackageSize);
                if (debug && !quiet) {
                    console.log(`Debug: Updated manifest.json with total_package_size`);
                }
            } catch {
                // manifest doesn't exist, skip
                if (debug && !quiet) {
                    console.log(`Debug: manifest.json not found, skipping update`);
                }
            }
        }

        if (!quiet) {
            console.log(`Successfully updated layout.json with ${layout.content.length} files`);
        }

        return {
            fileCount: layout.content.length,
            totalSize: totalPackageSize,
            layoutPath: layoutPathFile,
            manifestPath,
            skippedFiles: excludedCount,
            success: true
        };

    } catch (error: any) {
        return {
            fileCount: 0,
            totalSize: 0,
            layoutPath: layoutPathFile,
            manifestPath,
            skippedFiles: excludedCount,
            success: false,
            message: `Error processing ${packageDir}: ${error.message}`
        };
    }
};