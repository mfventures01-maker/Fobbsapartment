// This file exists to make violation impossible
export class AntiGravityViolation extends Error {
    constructor(operation: string) {
        super(`[ANTI-GRAVITY] Direct ${operation} is forbidden. Use rpcClient.call()`);
        this.name = 'AntiGravityViolation';
    }
}

export function blockDirectAccess() {
    throw new Error("🚫 Direct DB access is forbidden. Use RPC.");
}

export const forbiddenQuery = () => {
    blockDirectAccess();
};

// For runtime protection of array methods
export const protectedArray = <T>(arr: T[]): T[] => {
    return new Proxy(arr, {
        get(target, prop) {
            if (prop === 'reduce') {
                throw new Error("🚫 Financial calculations must be done via backend RPC");
            }
            return target[prop as keyof T[]];
        }
    });
};

