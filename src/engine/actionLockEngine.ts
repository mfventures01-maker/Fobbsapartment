import { create } from 'zustand';

interface ActionLockEngine {
    actionLockMap: Record<string, boolean>;
    lockAction: (actionName: string) => void;
    unlockAction: (actionName: string) => void;
    isLocked: (actionName: string) => boolean;
    withLock: <T>(actionName: string, fn: () => Promise<T>) => Promise<T>;
}

export const useActionLock = create<ActionLockEngine>((set, get) => ({
    actionLockMap: {},

    lockAction: (name) => set((state) => ({
        actionLockMap: { ...state.actionLockMap, [name]: true }
    })),

    unlockAction: (name) => set((state) => ({
        actionLockMap: { ...state.actionLockMap, [name]: false }
    })),

    isLocked: (name) => !!get().actionLockMap[name],

    withLock: async (name, fn) => {
        if (get().actionLockMap[name]) {
            console.warn(`[ActionLock] ${name} is currently locked. Preventing double submit.`);
            throw new Error(`Action ${name} is locked. Preventing double submit.`);
        }

        get().lockAction(name);
        try {
            return await fn();
        } finally {
            get().unlockAction(name);
        }
    }
}));
