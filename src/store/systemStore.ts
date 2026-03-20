import { create } from 'zustand';
import { callRPC } from '../lib/rpcClient';

export function assertUUID(id: string | null | undefined, label: string) {
    if (!id || id.length < 10) {
        throw new Error(`[ANTI-GRAVITY] Invalid ${label}`);
    }
}

export type SystemState = {
    business_id: string | null;
    location_id: string | null;
    user_id: string | null;
    orders: any[];
    kitchen: any[];
    inventory: any[];
    shifts: any[];
    timestamp: string | null;
};

interface SystemStore extends SystemState {
    setState: (data: SystemState) => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
    business_id: null,
    location_id: null,
    user_id: null,
    orders: [],
    kitchen: [],
    inventory: [],
    shifts: [],
    timestamp: null,

    setState: (data: SystemState) => set(data),
}));

export async function hydrateSystem(businessId: string, branchId: string) {
    assertUUID(branchId, "branch_id");
    assertUUID(businessId, "business_id");

    console.log("[HYDRATION]", {
        businessId,
        branchId
    });

    const data = await callRPC<SystemState>(
        "manager",
        "get_system_state",
        {
            p_business_id: businessId,
            p_location_id: branchId
        }
    );

    useSystemStore.getState().setState(data);
}
