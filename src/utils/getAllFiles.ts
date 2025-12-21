import { readdir, stat } from "fs/promises";
import * as path from "node:path";
import { ReadingDirError } from "@errors";

export const getAllFiles = async (dirPath: string) => {
    const files: string[] = [];

    async function readDirectory(currentPath: string): Promise<void> {
        try {
            for (const item of await readdir(currentPath)) {
                const itemPath = path.join(currentPath, item);
                const receivedFile = await stat(itemPath);

                if (receivedFile.isDirectory()) {
                    await readDirectory(itemPath);
                } else {
                    files.push(itemPath);
                }
            }
        } catch (e) {
            if (e instanceof Error) {
                throw new ReadingDirError(`Failed to read directory ${path}: ${e.message}.`);
            }
            throw new ReadingDirError(`Failed to read directory. Path: ${path}`);
        }
    }

    await readDirectory(dirPath);
    return files;
};