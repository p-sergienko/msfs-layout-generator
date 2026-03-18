import { readdir, stat } from "fs/promises";
import * as path from "node:path";
import { ReadingDirError } from "@errors";

export const getAllFiles = async (dirPath: string) => {
    const files: string[] = [];

    async function readDirectory(currentPath: string): Promise<void> {
        try {
            const directs = await readdir(currentPath, { withFileTypes: true });

            for (const dirent of directs) {
                const itemPath = path.join(currentPath, dirent.name);

                if (dirent.isDirectory()) {
                    await readDirectory(itemPath);
                } else if (dirent.isFile()) {
                    files.push(itemPath);
                } else if (dirent.isSymbolicLink()) {
                    const stats = await stat(itemPath);
                    if (stats.isDirectory()) {
                        await readDirectory(itemPath);
                    } else {
                        files.push(itemPath);
                    }
                }
            }
        } catch (e) {
            if (e instanceof Error) {
                throw new ReadingDirError(`Failed to read directory ${currentPath}: ${e.message}.`);
            }
            throw new ReadingDirError(`Failed to read directory. Path: ${currentPath}`);
        }
    }

    await readDirectory(dirPath);
    return files;
};