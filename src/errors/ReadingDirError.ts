export class ReadingDirError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReadingDirError";
    }
}
