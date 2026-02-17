import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2, Store } from 'lucide-react';
import { useBranch, Branch } from '@/contexts/BranchContext';

const BranchSwitcher: React.FC = () => {
    const { currentBranch, setBranch, branches } = useBranch();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleOpen = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (branch: Branch | 'all') => {
        setBranch(branch);
        setIsOpen(false);
    };

    const currentName = currentBranch === 'all' ? 'All Branches' : currentBranch.name;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleOpen}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            >
                <Store className="w-4 h-4 text-gray-500" />
                <span>{currentName}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 w-64 mt-2 origin-top-right bg-white border border-gray-100 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Select Scope
                        </div>
                        <button
                            onClick={() => handleSelect('all')}
                            className={`flex items-center w-full px-3 py-2 text-sm rounded-lg group ${currentBranch === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Building2 className={`w-4 h-4 mr-3 ${currentBranch === 'all' ? 'text-emerald-500' : 'text-gray-400'}`} />
                            <span className="flex-1 text-left">All Branches</span>
                            {currentBranch === 'all' && <Check className="w-4 h-4 text-emerald-600" />}
                        </button>

                        <div className="my-1 border-t border-gray-100"></div>

                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => handleSelect(branch)}
                                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg group ${currentBranch !== 'all' && currentBranch.id === branch.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <Store className={`w-4 h-4 mr-3 ${currentBranch !== 'all' && currentBranch.id === branch.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                                <span className="flex-1 text-left truncate">{branch.name}</span>
                                {currentBranch !== 'all' && currentBranch.id === branch.id && <Check className="w-4 h-4 text-emerald-600" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchSwitcher;
