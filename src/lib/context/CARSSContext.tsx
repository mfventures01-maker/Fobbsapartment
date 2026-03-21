// 🧬 CARSS CONTEXT: REACT INTERFACE FOR DETERMINISTIC CLIENT
// Purpose: Provide a reactive bridge to the CARSSClient.
// Law: Only one CARSSClient instance per terminal.

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CARSSClient, DeterministicIdentity, TerminalType } from '@/lib/core/carss-client';

interface CARSSContextValue {
    client: CARSSClient | null;
    identity: DeterministicIdentity | null;
    isLoading: boolean;
    error: Error | null;
    initialize: () => Promise<void>;
}

const CARSSContext = createContext<CARSSContextValue | undefined>(undefined);

interface CARSSProviderProps {
    children: ReactNode;
    terminalType: TerminalType;
    supabaseUrl: string;
    supabaseKey: string;
}

export function CARSSProvider({ children, terminalType, supabaseUrl, supabaseKey }: CARSSProviderProps) {
    const [client, setClient] = useState<CARSSClient | null>(null);
    const [identity, setIdentity] = useState<DeterministicIdentity | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const initialize = async () => {
        try {
            setIsLoading(true);
            console.log(`[CARSS] Initializing ${terminalType} client...`);
            const carssClient = new CARSSClient(supabaseUrl, supabaseKey, terminalType);
            const userIdentity = await carssClient.validateIdentity();

            setClient(carssClient);
            setIdentity(userIdentity);
            setError(null);
            console.log(`[CARSS] ${terminalType} client ready.`);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Initialization failed'));
            console.error('CARSS initialization failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        initialize();
    }, [terminalType]);

    return (
        <CARSSContext.Provider value={{ client, identity, isLoading, error, initialize }}>
            {children}
        </CARSSContext.Provider>
    );
}

export function useCARSS() {
    const context = useContext(CARSSContext);
    if (context === undefined) {
        throw new Error('useCARSS must be used within a CARSSProvider');
    }
    return context;
}
