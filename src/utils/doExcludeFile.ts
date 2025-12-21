import * as path from "node:path";
import { excludedFiles } from "@/constants/constants";

export const doExcludeFile = (relativePath: string) => {
    const fileName = path.basename(relativePath).toLowerCase();

    if (relativePath.toLowerCase().startsWith('_cvt_/')) {
        return true;
    }

    return excludedFiles.has(fileName);
}