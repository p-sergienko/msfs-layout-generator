export class ManifestWritingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ManifestWritingError";
    }
}
