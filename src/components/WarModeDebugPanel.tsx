import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftEngine } from '@/engine/shiftEngine';
import { usePaymentEngine } from '@/engine/paymentEngine';
import { useInventoryEngine } from '@/engine/inventoryEngine';
import { Bug, X } from 'lucide-react';

const WarModeDebugPanel: React.FC = () => {
    const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.REACT_APP_DEBUG === 'true';
    const [isOpen, setIsOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);

    const { authority } = useAuth();
    const { activeShift } = useShiftEngine();
    const { currentIntent } = usePaymentEngine();
    const { items: inventoryItems } = useInventoryEngine();

    if (!isDebugEnabled) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 bg-red-600 text-white p-3 rounded-full shadow-2xl hover:bg-red-700 transition-all flex items-center justify-center animate-pulse border-2 border-red-400"
                title="Open War Mode Debug Panel"
            >
                <Bug className="w-5 h-5" />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 bg-gray-900 border border-red-500 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${minimized ? 'w-12 h-12' : 'w-96 max-h-[80vh] flex flex-col'}`}>

            {/* Header */}
            <div className="bg-red-600 text-white p-2 flex justify-between items-center cursor-pointer" onClick={() => setMinimized(!minimized)}>
                <div className="flex items-center space-x-2 font-mono text-sm font-bold">
                    <Bug className="w-4 h-4" />
                    {!minimized && <span>WAR MODE DEBUG</span>}
                </div>
                {!minimized && (
                    <div className="flex space-x-2">
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:text-red-200">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {!minimized && (
                <div className="p-4 overflow-y-auto bg-gray-900 text-green-400 font-mono text-xs space-y-4">

                    <div>
                        <h3 className="text-red-400 border-b border-red-800 pb-1 mb-2">AUTHORITY OBJECT</h3>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(authority, null, 2)}</pre>
                    </div>

                    <div>
                        <h3 className="text-red-400 border-b border-red-800 pb-1 mb-2">SHIFT CONTEXT</h3>
                        {activeShift ? (
                            <ul className="space-y-1">
                                <li><span className="text-gray-500">shift_id:</span> {activeShift.id}</li>
                                <li><span className="text-gray-500">status:</span> {activeShift.ends_at ? 'CLOSED' : 'OPEN'}</li>
                            </ul>
                        ) : (
                            <span className="text-gray-500 italic">No Active Shift</span>
                        )}
                    </div>

                    <div>
                        <h3 className="text-red-400 border-b border-red-800 pb-1 mb-2">PAYMENT INTENT</h3>
                        {currentIntent ? (
                            <ul className="space-y-1">
                                <li><span className="text-gray-500">intent_id:</span> {currentIntent.id}</li>
                                <li><span className="text-gray-500">status:</span> {currentIntent.status}</li>
                                <li><span className="text-gray-500">amount:</span> {currentIntent.expected_amount}</li>
                                {/* transaction_id would need to be tracked if stored in intent or mapped separately */}
                            </ul>
                        ) : (
                            <span className="text-gray-500 italic">No Intent Active</span>
                        )}
                    </div>

                    <div>
                        <h3 className="text-red-400 border-b border-red-800 pb-1 mb-2">INVENTORY LEVELS (SYNCED)</h3>
                        <div className="max-h-32 overflow-y-auto">
                            {inventoryItems.length > 0 ? (
                                <ul className="space-y-1">
                                    {inventoryItems.map(item => (
                                        <li key={item.id} className="flex justify-between">
                                            <span>{item.name}</span>
                                            <span className="text-yellow-400">{item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="text-gray-500 italic">No inventory fetched</span>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default WarModeDebugPanel;
