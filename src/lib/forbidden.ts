// This file exists to make violation impossible
export class AntiGravityViolation extends Error {
    constructor(operation: string) {
        super(`[ANTI-GRAVITY] Direct ${operation} is forbidden. Use rpcClient.call()`);
        this.name = 'AntiGravityViolation';
    }
}

export const forbiddenQuery = () => {
    throw new AntiGravityViolation('table access');
};

// For runtime protection of array methods
export const protectedArray = <T>(arr: T[]): T[] => {
    return new Proxy(arr, {
        get(target, prop) {
            if (prop === 'map' || prop === 'filter' || prop === 'reduce') {
                console.warn('[ANTI-GRAVITY] Array operations should only be for rendering, not logic');
            }
            return target[prop as keyof T[]];
        }
    });
};
