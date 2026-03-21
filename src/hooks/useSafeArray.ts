export function useSafeArray<T>(data: T[] | undefined | null): T[] {
    return data ?? [];
}
