
import React from 'react';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { Send, Edit2, MessageSquare, AlertCircle } from 'lucide-react';

interface ConfirmSendPanelProps {
    typeLabel: string;
    requestId: string;
    roomNumber: string;
    summaryLines: string[];
    subtotal?: number;
    notes?: string;
    onEdit: () => void;
    onSendWhatsApp: () => void;
    onSendTelegram: () => void;
}

export const ConfirmSendPanel: React.FC<ConfirmSendPanelProps> = ({
    typeLabel, requestId, roomNumber, summaryLines, subtotal, notes, onEdit, onSendWhatsApp, onSendTelegram
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h4 className="text-xl font-bold text-emerald-900">Confirm Request</h4>
                <p className="text-sm text-gray-500">Review details before sending.</p>
            </div>

            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                    <div>
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Reference ID</span>
                        <span className="font-mono font-bold text-emerald-900 text-lg">{requestId}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Room</span>
                        <span className="font-mono font-bold text-emerald-900 text-lg">{roomNumber}</span>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-emerald-900">
                    <p className="font-bold uppercase text-xs text-emerald-500">{typeLabel}</p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                        {summaryLines.map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </div>

                {subtotal !== undefined && subtotal > 0 && (
                    <div className="border-t border-emerald-100 pt-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-600 uppercase">Estimated Total</span>
                        <span className="text-xl font-bold text-emerald-900">₦{subtotal.toLocaleString()}</span>
                    </div>
                )}

                {notes && (
                    <div className="pt-2">
                        <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Notes</p>
                        <p className="text-sm text-emerald-800 italic bg-white/50 p-2 rounded-lg border border-emerald-100/50">
                            "{notes}"
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 p-3 rounded-xl flex items-start space-x-3 text-xs text-blue-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Sending this will open your messaging app. Please hit "Send" in the app to complete the request.</p>
            </div>

            <div className="space-y-3 pt-2">
                <button
                    onClick={onSendWhatsApp}
                    className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-[#20bd5a] transition-all flex items-center justify-center space-x-2"
                >
                    <Send className="w-5 h-5" />
                    <span>Send via WhatsApp</span>
                </button>

                {HOTEL_CONFIG.channels.telegram_handle && (
                    <button
                        onClick={onSendTelegram}
                        className="w-full py-4 bg-[#0088cc] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-[#0077b5] transition-all flex items-center justify-center space-x-2"
                    >
                        <Send className="w-5 h-5" />
                        <span>Send via Telegram</span>
                    </button>
                )}

                <button
                    onClick={onEdit}
                    className="w-full py-3 text-gray-500 font-bold hover:text-gray-900 flex items-center justify-center space-x-2"
                >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Request</span>
                </button>
            </div>
        </div>
    );
};
