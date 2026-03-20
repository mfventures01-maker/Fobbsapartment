import { createContext, useContext, useEffect, useState } from 'react';
import { callRPC, type TerminalType } from '../lib/rpcClient';

interface TerminalContextValue {
    terminalId: string;
    terminalType: TerminalType;
    branchId: string;
    deviceId: string;
    isLoading: boolean;
    error: Error | null;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

export function TerminalProvider({
    children,
    terminalType,
    branchId
}: {
    children: React.ReactNode;
    terminalType: TerminalType;
    branchId: string;
}) {
    const [state] = useState<Omit<TerminalContextValue, 'isLoading' | 'error'>>({
        terminalId: crypto.randomUUID(),
        terminalType,
        branchId,
        deviceId: crypto.randomUUID()
    });

    // Register terminal with backend
    useEffect(() => {
        const registerTerminal = async () => {
            try {
                await callRPC(terminalType, 'register_terminal', {
                    p_terminal_id: state.terminalId,
                    p_terminal_type: terminalType,
                    p_branch_id: branchId,
                    p_device_id: state.deviceId
                });
            } catch (e) {
                console.error('[ANTI-GRAVITY] Terminal registration failed', e);
            }
        };

        registerTerminal();
    }, [branchId, state.deviceId, state.terminalId, terminalType]);

    return (
        <TerminalContext.Provider value= {{
            ...state,
            isLoading: false,
                error: null
    }
}>
    { children }
    </TerminalContext.Provider>
    );
}

export const useTerminal = () => {
    const context = useContext(TerminalContext);
    if (!context) {
        throw new Error('useTerminal must be used within TerminalProvider');
    }
    return context;
};
