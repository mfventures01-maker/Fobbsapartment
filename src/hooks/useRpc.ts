import { useCallback } from 'react';
import { rpcClient, type TerminalType } from '../lib/rpcClient';
import { useTerminal } from './useTerminal';
import { useShift } from '../contexts/ShiftContext';

export function useRpc() {
    const { terminalId, branchId, terminalType } = useTerminal();
    const { activeShift } = useShift();

    const call = useCallback(async <TPayload, TResponse>(
        functionName: string,
        payload: TPayload,
        options?: {
            idempotencyKey?: string;
            requireShift?: boolean; // If true, block when no shift
        }
    ) => {
        // ENFORCE SHIFT REQUIREMENT
        if (options?.requireShift && !activeShift) {
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

        // Let the RPC client handle the call
        return rpcClient.call<TPayload, TResponse>({
            function: functionName,
            payload,
            idempotency_key: options?.idempotencyKey
        });
    }, [activeShift, branchId, terminalType]);

    return { call };
}
