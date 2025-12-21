import { readFile } from "fs/promises";
import { ReadingJsonError } from "@errors";

export async function readJson<T = unknown>(path: string): Promise<T | null> {
    try {
        const data = await readFile(path, "utf8");
        return JSON.parse(data) as T;
    } catch (e) {
        if (e instanceof Error) {
            throw new ReadingJsonError(`Failed to read JSON at ${path}: ${e.message}.`);
        }
        throw new ReadingJsonError("Failed to read JSON due to unexpected error.");
    }
}