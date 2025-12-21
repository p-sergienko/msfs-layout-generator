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