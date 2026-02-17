
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface DemoEvent {
    id: string;
    paymentType: "POS" | "TRANSFER" | "CASH";
    amount: number;
    actorRole: "staff" | "ceo";
    actorName: string;
    source: "frontend-demo";
    timestamp: number;
    readableTime: string;
    status: "verified" | "pending" | "reversed" | "dispute";
    customer_reference?: string;
}

interface DemoContextType {
    events: DemoEvent[];
    addEvent: (event: Omit<DemoEvent, 'id' | 'timestamp' | 'readableTime' | 'source'>) => void;
    updateEventStatus: (id: string, status: DemoEvent['status']) => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [events, setEvents] = useState<DemoEvent[]>([]);

    const addEvent = (eventData: Omit<DemoEvent, 'id' | 'timestamp' | 'readableTime' | 'source'>) => {
        const newEvent: DemoEvent = {
            ...eventData,
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: "frontend-demo",
            timestamp: Date.now(),
            readableTime: new Date().toLocaleString(),
        };

        setEvents(prev => [newEvent, ...prev]);

        console.log('[CARSS-DEMO] Payment Event Emitted', newEvent);
        toast.success(`[DEMO] ${newEvent.paymentType} payment recorded!`);
    };

    const updateEventStatus = (id: string, status: DemoEvent['status']) => {
        setEvents(prev => prev.map(evt =>
            evt.id === id ? { ...evt, status } : evt
        ));
        toast.success(`[DEMO] Event ${status} successfully!`);
    };

    // Live DevTools Exposure
    useEffect(() => {
        // @ts-ignore
        window.__CARSS_DEMO_STORE__ = {
            events,
            addEvent,
            updateEventStatus,
            _help: "Use addEvent({ paymentType: 'CASH', amount: 5000, actorRole: 'staff', actorName: 'John', status: 'verified' })"
        };
    }, [events]);

    return (
        <DemoContext.Provider value={{ events, addEvent, updateEventStatus }}>
            {children}
        </DemoContext.Provider>
    );
};

export const useDemo = () => {
    const context = useContext(DemoContext);
    if (!context) {
        throw new Error('useDemo must be used within a DemoProvider');
    }
    return context;
};
