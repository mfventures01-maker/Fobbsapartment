import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';

interface SuggestionProps {
    label: string;
    type: 'critical' | 'fraud' | 'routine';
    onAction: () => void;
}

const AntiGravitySuggestion: React.FC<SuggestionProps> = ({ label, type, onAction }) => {
    const getIcon = () => {
        switch (type) {
            case 'critical': return <Zap className="w-4 h-4 text-amber-500" />;
            case 'fraud': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default: return <Zap className="w-4 h-4 text-emerald-500" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'critical': return 'border-amber-200 bg-amber-50 text-amber-900';
            case 'fraud': return 'border-red-200 bg-red-50 text-red-900';
            default: return 'border-emerald-200 bg-emerald-50 text-emerald-900';
        }
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-2 border rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer hover:shadow-md transition-all ${getStyles()}`}
            onClick={onAction}
        >
            {getIcon()}
            <span className="text-sm font-medium">{label}</span>
            <span className="ml-2 text-xs opacity-60">Press ⏎</span>
        </div>
    );
};

export default AntiGravitySuggestion;
