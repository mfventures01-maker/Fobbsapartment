import { useCallback } from 'react';
import { rpcClient } from '../lib/rpcClient';
import { useTerminal } from './useTerminal';
import { useShift } from './useShift';

export function useRpc() {
    const { branchId, terminalType } = useTerminal();
    const { currentShift } = useShift();

    const call = useCallback(async <TPayload, TResponse>(
        functionName: string,
        payload: TPayload,
        options?: {
            idempotencyKey?: string;
            requireShift?: boolean; // If true, block when no shift
        }
    ) => {
        // ENFORCE SHIFT REQUIREMENT (Zero Drift Protocol)
        if (options?.requireShift && !currentShift) {
            return {
                data: null,
                error: {
                    code: 'NO_ACTIVE_SHIFT',
                    message: 'This operation requires an active shift',
                    details: { terminalType, branchId }
                },
                meta: {
                    execution_time_ms: 0,
                    backend_timestamp: new Date().toISOString()
                }
            };
        }

        // Let the RPC client handle the call with correct parameter ordering
        return rpcClient.call<TResponse>(
            functionName,
            {
                ...payload,
                p_idempotency_key: options?.idempotencyKey
            },
            terminalType
        );
    }, [currentShift, branchId, terminalType]);

    return { call };
}
