export type Content = {
    path: string;
    size: number;
    date: number;
}

export type Layout = {
    content: Content[];
}

export type Manifest = {
    [key: string]: unknown;
    total_package_size?: string;
}

export interface ProcessOptions {
    force?: boolean;
    quiet?: boolean;
    debug?: boolean;
    checkManifest?: boolean;
    skipManifestUpdate?: boolean;
    returnResult?: boolean; // NEW: Control return type
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