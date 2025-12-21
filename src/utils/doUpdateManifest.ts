import { readFile, writeFile } from "fs/promises";
import type { Manifest } from "@/index.d";
import { ManifestWritingError } from "@errors";

export const doUpdateManifest = async (manifestPath: string, totalPackageSize: number): Promise<void> => {
    try {
        const manifestContent = await readFile(manifestPath, 'utf8');
        const manifest: Manifest = JSON.parse(manifestContent);

        if (manifest.total_package_size !== undefined) {
            manifest.total_package_size = totalPackageSize.toString().padStart(20, '0');
            const json = JSON.stringify(manifest, null, 2);
            await writeFile(manifestPath, json, 'utf8');
        }
    } catch (e: any) {
        if (e instanceof Error) {
            throw new ManifestWritingError(`Failed to read JSON at ${manifestPath}, size ${totalPackageSize}: ${e.message}.`);
        }
        throw new ManifestWritingError("Failed to read JSON due to unexpected error.");
    }
};