#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import chokidar from 'chokidar';
import { doProcessLayoutFileCli } from "@utils/processLayout";

// Define the program
const program = new Command();

// Helper function for consistent logging
const logger = {
    info: (message: string) => console.log(chalk.blue('ℹ'), message),
    success: (message: string) => console.log(chalk.green('✓'), message),
    error: (message: string) => console.log(chalk.red('✗'), message),
    header: (message: string) => console.log(chalk.bold.cyan(message)),
    dim: (message: string) => console.log(chalk.dim(message))
};

/**
 * MSFS Layout Generator CLI Tool
 *
 * Generates or updates layout.json for MSFS community packages.
 *
 * @example
 * // Generate layout.json for a package
 * msfs-layout "F:\\fs20\\Community\\my-package"
 *
 * @example
 * // Generate for multiple packages
 * msfs-layout "package1" "package2" "package3"
 *
 * @example
 * // Watch directory for changes
 * msfs-layout "./my-package" --watch
 *
 * @example
 * // Show help
 * msfs-layout --help
 */

// Configure the CLI program
program
    .name('msfs-layout')
    .description(chalk.bold('Generate or update layout.json for MSFS community packages'))
    .argument('[directories...]', 'Path to MSFS package directory(ies) containing manifest.json')
    .option('-f, --force', 'Force overwrite existing layout.json without confirmation')
    .option('-q, --quiet', 'Suppress non-essential output')
    .option('-d, --debug', 'Enable debug logging for troubleshooting')
    .option('--no-manifest-check', 'Skip manifest.json existence check')
    .option('-w, --watch', 'Watch directory for changes and regenerate automatically')
    .action(async (directories: string[], options) => {
        await handleAction(directories, options);
    })
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Process a single package')}
  msfs-layout "C:\\Route To your\\Community\\Folder"

  ${chalk.dim('# Process multiple packages')}
  msfs-layout "First root" "Second root" "Third one"

  ${chalk.dim('# Process current directory')}
  msfs-layout .

  ${chalk.dim('# Force overwrite existing layout.json')}
  msfs-layout ./my-package --force

  ${chalk.dim('# Quiet mode - minimal output')}
  msfs-layout ./my-package --quiet

  ${chalk.dim('# Watch directory for changes')}
  msfs-layout ./my-package --watch

${chalk.bold('Notes:')}
  • Each directory should contain a ${chalk.cyan('manifest.json')} file
  • Creates/updates ${chalk.cyan('layout.json')} in the same directory
  • Automatically excludes ${chalk.yellow('_CVT_')} directories
  • Updates ${chalk.cyan('total_package_size')} in manifest.json
  • Watch mode works with a ${chalk.yellow('single directory')} only
  • Use ${chalk.cyan('Ctrl+C')} to exit watch mode
  `);

// Handle the main action
async function handleAction(directories: string[], options: any) {
    const { force, quiet, debug, manifestCheck, watch } = options;

    // Show header if not in quiet mode
    if (!quiet) {
        logger.header(`msfs-layout-generator`);
        console.log(); // Empty line
    }

    // Check if directories were provided
    if (!directories || directories.length === 0) {
        logger.error('No directories specified.');
        logger.info('Use msfs-layout --help for usage information.');
        process.exit(1);
    }

    if (watch && directories.length > 1) {
        logger.error('Watch mode only supports a single directory.');
        logger.info('Please specify only one directory when using --watch flag.');
        process.exit(1);
    }

    // Handle watch mode
    if (watch) {
        await handleWatchMode(directories[0], { force, quiet, debug, manifestCheck });
        return;
    }

    const errors: string[] = [];
    const successes: string[] = [];
    let totalFilesProcessed = 0;

    // Process each directory
    for (const dir of directories) {
        try {
            const fullPath = path.resolve(dir);

            if (!quiet) {
                logger.info(`Processing: ${chalk.underline(fullPath)}`);
            }

            if (debug) {
                logger.dim(`  Debug: Resolved path: ${fullPath}`);
            }

            // Check if directory exists
            if (!fs.existsSync(fullPath)) {
                new Error(`Directory does not exist`);
            }

            // Run the main processing function
            const result = await doProcessLayoutFileCli(fullPath, {
                force,
                quiet,
                debug,
                checkManifest: manifestCheck
            });

            totalFilesProcessed += result.fileCount || 0;
            successes.push(path.basename(fullPath));

            if (!quiet) {
                logger.success(`Generated layout.json for ${chalk.bold(path.basename(fullPath))}`);
                if (result.fileCount) {
                    logger.dim(`  ${result.fileCount} files included`);
                }
                if (result.totalSize) {
                    logger.dim(`  Total package size: ${formatFileSize(result.totalSize)}`);
                }
                console.log(); // Empty line for separation
            }

        } catch (error: any) {
            const errorMsg = `Failed to process ${dir}: ${error.message}`;
            errors.push(errorMsg);

            if (!quiet) {
                logger.error(errorMsg);
                if (debug && error.stack) {
                    logger.dim(error.stack);
                }
            }
        }
    }

    // Show summary
    if (!quiet) {
        console.log(chalk.bold.cyan('='.repeat(50)));
        if (successes.length > 0) {
            logger.success(`Successfully processed ${successes.length} package(s):`);
            successes.forEach(pkg => logger.dim(`  • ${pkg}`));
        }

        if (errors.length > 0) {
            console.log(); // Empty line
            logger.error(`Failed to process ${errors.length} package(s):`);
            errors.forEach(err => logger.dim(`  • ${err}`));
        }

        if (totalFilesProcessed > 0) {
            console.log(); // Empty line
            logger.info(`Total files processed: ${chalk.bold(totalFilesProcessed.toString())}`);
        }
    }

    // Exit with appropriate code
    if (errors.length > 0) {
        process.exit(1);
    } else if (successes.length === 0) {
        logger.error('No packages were processed.');
        process.exit(1);
    }
}

async function handleWatchMode(dir: string, options: any) {
    const { quiet, debug, manifestCheck, watchInterval, watchDebounce } = options;

    const fullPath = path.resolve(dir);

    if (!fs.existsSync(fullPath)) {
        logger.error(`Directory does not exist: ${fullPath}`);
        process.exit(1);
    }

    if (!quiet) {
        logger.info(`Watching: ${chalk.underline(fullPath)}`);
        logger.info(`Press ${chalk.yellow('Ctrl+C')} to stop watching`);
        console.log();
    }

    if (!quiet) {
        logger.info(`Running initial processing...`);
    }

    try {
        await doProcessLayoutFileCli(fullPath, {
            force: true,
            quiet,
            debug,
            checkManifest: manifestCheck
        });

        console.log();
    } catch (error: any) {
        logger.error(`Initial processing failed: ${error.message}`);
        if (debug && error.stack) {
            logger.dim(error.stack);
        }
        process.exit(1);
    }

    let debounceTimer: NodeJS.Timeout;
    let isProcessing = false;
    let changeCount = 0;

    const watcher = chokidar.watch(fullPath, {
        ignored: [
            path.join(fullPath, 'layout.json'),
            path.join(fullPath, 'manifest.json')
        ],
        ignoreInitial: true,
        persistent: true,
        interval: parseInt(watchInterval),
        depth: 99
    });

    const processChanges = async () => {
        if (isProcessing) {
            if (debug) {
                logger.dim('Skipping - already processing');
            }
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            isProcessing = true;
            changeCount++;

            try {
                await doProcessLayoutFileCli(fullPath, {
                    force: true,
                    quiet: true
                });
            } catch (error: any) {
                const timestamp = new Date().toLocaleTimeString();
                if (!quiet) {
                    logger.error(`[${timestamp}] Failed to regenerate: ${error.message}`);
                    if (debug && error.stack) {
                        logger.dim(error.stack);
                    }
                }
            } finally {
                isProcessing = false;
            }
        }, parseInt(watchDebounce));
    };

    const timestamp = new Date().toLocaleTimeString();

    watcher
        .on('add', (filePath: string) => {
            if (!quiet) {
                logger.dim(`[${timestamp}] File added: ${path.relative(fullPath, filePath)}`);
            }
            processChanges();
        })
        .on('change', (filePath: string) => {
            if (!quiet) {
                logger.dim(`[${timestamp}] File changed: ${path.relative(fullPath, filePath)}`);
            }
            processChanges();
        })
        .on('unlink', (filePath: string) => {
            if (!quiet) {
                logger.dim(`[${timestamp}] File removed: ${path.relative(fullPath, filePath)}`);
            }
            processChanges();
        })
        .on('addDir', (dirPath: string) => {
            if (!quiet) {
                logger.dim(`[${timestamp}] Directory added: ${path.relative(fullPath, dirPath)}`);
            }
            processChanges();
        })
        .on('unlinkDir', (dirPath: string) => {
            if (!quiet) {
                logger.dim(`[${timestamp}] Directory removed: ${path.relative(fullPath, dirPath)}`);
            }
            processChanges();
        })
        .on('error', (error: unknown) => {
            if (error instanceof Error) {
                logger.error(`Watcher error: ${error.message}`);
            }
        });

    process.on('SIGINT', async () => {
        if (!quiet) {
            console.log();
            logger.info('Stopping watch mode...');
        }

        await watcher.close();

        if (!quiet) {
            logger.success(`Watch mode stopped`);
            logger.info(`Total changes processed: ${changeCount}`);
        }

        process.exit(0);
    });

    await new Promise<void>(() => {
        // This promise never resolves keeping the process alive
    });
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle unhandled errors
process.on('unhandledRejection', (error: any) => {
    logger.error(`Unhandled error: ${error.message}`);
    if (program.opts().debug && error.stack) {
        console.error(chalk.dim(error.stack));
    }
    process.exit(1);
});

// Parse arguments
try {
    program.parse(process.argv);
} catch (error: any) {
    logger.error(`Failed to parse arguments: ${error.message}`);
    process.exit(1);
}