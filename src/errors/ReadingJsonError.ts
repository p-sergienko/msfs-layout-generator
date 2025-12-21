export class ReadingJsonError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReadingJsonError";
    }
}
