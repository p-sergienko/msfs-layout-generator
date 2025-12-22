import * as path from "node:path";
import type { Layout, Content } from "@/index.d";
import { getAllFiles } from "@utils/getAllFiles";
import { doExcludeFile } from "@utils/doExcludeFile";
import { stat, writeFile, constants, access } from "fs/promises";
import { getWindowsFileTime } from "@utils/getWindowsFileTime";
import { doUpdateManifest } from "@utils/doUpdateManifest";
import { ProcessOptions, ProcessResult } from "@/index.d";

/**
 * Unified function to process layout files for MSFS packages
 * Can be used both programmatically and via CLI
 *
 * @param packageDir - Path to MSFS package directory
 * @param options - Processing options
 * @returns Promise<void> if returnResult=false, Promise<ProcessResult> if returnResult=true
 */

export const processLayout = async (
    packageDir: string,
    options: ProcessOptions = {}
): Promise<void | ProcessResult> => {
    const {
        force = false,
        quiet = false,
        debug = false,
        checkManifest = true,
        skipManifestUpdate = false,
        returnResult = false // Default: behave like old doProcessLayoutFile
    } = options;

    const layoutPathFile = path.join(packageDir, 'layout.json');
    const manifestPath = path.join(packageDir, 'manifest.json');

    // Helper logging function
    const log = (message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
        if (quiet) return;

        const prefixes = {
            info: 'ℹ',
            warn: '⚠',
            error: '✗',
            success: '✓'
        };

        console.log(`${prefixes[type]} ${message}`);
    };

    // Validate input directory exists
    try {
        await access(packageDir, constants.F_OK);
    } catch {
        const error = `Directory does not exist: ${packageDir}`;
        log(error, 'error');

        if (returnResult) {
            return {
                fileCount: 0,
                totalSize: 0,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: 0,
                success: false,
                message: error
            };
        }
        throw new Error(error);
    }

    // Check for manifest.json if required
    if (checkManifest) {
        try {
            await access(manifestPath, constants.F_OK);
        } catch {
            const error = `manifest.json not found in ${packageDir}`;
            log(error, 'error');

            if (returnResult) {
                return {
                    fileCount: 0,
                    totalSize: 0,
                    layoutPath: layoutPathFile,
                    manifestPath,
                    skippedFiles: 0,
                    success: false,
                    message: error
                };
            }
            throw new Error(error);
        }
    }

    // Check if layout.json already exists
    let shouldProceed = true;
    let skipReason = '';

    try {
        await access(layoutPathFile, constants.F_OK);
        if (!force) {
            skipReason = 'layout.json already exists. Use --force to overwrite.';
            shouldProceed = false;
        } else if (debug) {
            log('layout.json exists, will overwrite due to --force flag', 'info');
        }
    } catch {
        // layout.json doesn't exist, that's fine
        if (debug) {
            log('No existing layout.json found, creating new one', 'info');
        }
    }

    if (!shouldProceed) {
        if (returnResult) {
            return {
                fileCount: 0,
                totalSize: 0,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: 0,
                success: false,
                message: skipReason
            };
        }
        log(skipReason, 'warn');
        return;
    }

    // Main processing logic
    let totalPackageSize = 0;
    const layout: Layout = { content: [] };
    let hasLongPath = false;
    let excludedCount = 0;

    try {
        const allFiles = await getAllFiles(packageDir);

        if (debug) {
            log(`Found ${allFiles.length} total files in ${packageDir}`, 'info');
        }

        if (allFiles.length === 0) {
            const error = 'No files found in package directory';
            log(error, 'error');

            if (returnResult) {
                return {
                    fileCount: 0,
                    totalSize: 0,
                    layoutPath: layoutPathFile,
                    manifestPath,
                    skippedFiles: 0,
                    success: false,
                    message: error
                };
            }
            throw new Error(error);
        }

        for (const file of allFiles) {
            // Check for long file paths (Windows limitation)
            if (file.length > 259) {
                hasLongPath = true;
                if (debug) {
                    log(`Skipping long path: ${file}`, 'info');
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
                    if (debug) {
                        log(`Excluding file: ${relativePath}`, 'info');
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
                if (debug) {
                    log(`Error processing file ${file}: ${error.message}`, 'info');
                }
                excludedCount++;
            }
        }

        if (hasLongPath) {
            log('One or more file paths exceed 259 characters and were skipped.', 'warn');
        }

        if (layout.content.length === 0) {
            const error = 'No valid files to include in layout.json';
            log(error, 'error');

            if (returnResult) {
                return {
                    fileCount: 0,
                    totalSize: 0,
                    layoutPath: layoutPathFile,
                    manifestPath,
                    skippedFiles: excludedCount,
                    success: false,
                    message: error
                };
            }
            throw new Error(error);
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
                if (debug) {
                    log('Updated manifest.json with total_package_size', 'info');
                }
            } catch {
                // manifest doesn't exist, skip
                if (debug) {
                    log('manifest.json not found, skipping update', 'info');
                }
            }
        }

        log(`Successfully updated layout.json with ${layout.content.length} files`, 'success');

        if (returnResult) {
            return {
                fileCount: layout.content.length,
                totalSize: totalPackageSize,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: excludedCount,
                success: true
            };
        }

    } catch (error: any) {
        const errorMsg = `Error processing ${packageDir}: ${error.message}`;
        log(errorMsg, 'error');

        if (returnResult) {
            return {
                fileCount: 0,
                totalSize: 0,
                layoutPath: layoutPathFile,
                manifestPath,
                skippedFiles: excludedCount,
                success: false,
                message: errorMsg
            };
        }
        throw error;
    }
};

export const doProcessLayoutFile = (layoutPath: string): Promise<void> =>
    processLayout(layoutPath, { returnResult: false }) as Promise<void>;

export const doProcessLayoutFileCli = (packageDir: string, options: Omit<ProcessOptions, 'returnResult'> = {}): Promise<ProcessResult> =>
    processLayout(packageDir, { ...options, returnResult: true }) as Promise<ProcessResult>;