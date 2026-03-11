export const safeNumber = (value: number | undefined | null): string => {
    return Number(value ?? 0).toLocaleString();
};
