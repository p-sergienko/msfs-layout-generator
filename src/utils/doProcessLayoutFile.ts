import * as path from "node:path";
import type { Layout, Content } from "@/index.d";
import { getAllFiles } from "@utils/getAllFiles";
import { doExcludeFile } from "@utils/doExcludeFile";
import { stat, writeFile, constants, readdir, access } from "fs/promises";
import { getWindowsFileTime } from "@utils/getWindowsFileTime";
import { doUpdateManifest } from "@utils/doUpdateManifest";

export const doProcessLayoutFile = async (layoutPath: string): Promise<void> => {
    const layoutPathFile = path.join(layoutPath, 'layout.json');

    const directory = await readdir(layoutPath);

    if (!directory.includes('layout.json')) {
        console.log(`No layout.json is found in "${layoutPath}". A new layout will be created.`);
        await writeFile(layoutPathFile, "", 'utf8');
    }

    let totalPackageSize = 0;
    const layout: Layout = { content: [] };

    try {
        const allFiles = await getAllFiles(layoutPath);
        let hasLongPath = false;

        for (const file of allFiles) {
            if (file.length > 259) {
                hasLongPath = true;
                continue;
            }

            const relativePath = path.relative(layoutPath, file).split(path.sep).join('/');
            const isExcluded = doExcludeFile(relativePath);

            try {
                const stats = await stat(file);

                totalPackageSize += stats.size;

                if (isExcluded) {
                    continue;
                }

                const content: Content = {
                    path: relativePath,
                    size: stats.size,
                    date: getWindowsFileTime(stats.mtime)
                };

                layout.content.push(content);

            } catch (error: any) {
                console.log(`Error processing file ${file}: ${error.message}`);
            }
        }

        if (hasLongPath) {
            console.log(`Warning: One or more file paths in the folder containing "${layoutPath}" are 260 characters or greater in length. Some files may have been skipped.`);
        }

        if (layout.content.length === 0) {
            console.log(`No files were found in the folder containing "${layoutPath}". The layout.json will not be updated.`);
            return;
        }

        // Sort content by path for consistent output
        layout.content.sort((a, b) => a.path.localeCompare(b.path));

        // Write layout.json with LF line endings
        const json = JSON.stringify(layout, null, 2).replace(/\r\n/g, '\n');

        await writeFile(layoutPathFile, json, 'utf8');
        // Add layout.json size to total
        const layoutStats = await stat(layoutPath);
        totalPackageSize += layoutStats.size;

        // Update manifest.json if it exists
        const manifestPath = path.join(layoutPath, 'manifest.json');

        try {
            await access(manifestPath, constants.F_OK);
            await doUpdateManifest(manifestPath, totalPackageSize);
        } catch {
            // manifest doesn't exist, skip
        }

        console.log(`Successfully updated ${layoutPath} with ${layout.content.length} files`);

    } catch (error: any) {
        console.log(`Error processing ${layoutPathFile}: ${error.message}`);
    }
}