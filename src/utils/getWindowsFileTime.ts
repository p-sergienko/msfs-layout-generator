export const getWindowsFileTime = (date: Date): number => {
    const windowsEpoch = new Date('1601-01-01T00:00:00Z').getTime();
    const unixEpoch = new Date('1970-01-01T00:00:00Z').getTime();
    const millisecondsToWindowsEpoch = windowsEpoch - unixEpoch;
    const fileTime = (date.getTime() - millisecondsToWindowsEpoch) * 10000;
    return Math.floor(fileTime);
};