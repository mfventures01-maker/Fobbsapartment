import React from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { MapPin, ArrowRight } from 'lucide-react';

const CeoBranches: React.FC = () => {
    const { branches } = useBranch();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Branch Management</h2>
                <p className="text-sm text-gray-500">View and manage detailed status of all locations.</p>
            </div>

            <div className="grid gap-6">
                {branches.map((branch) => (
                    <div key={branch.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{branch.name}</h3>
                                <div className="flex items-center text-gray-500 mt-1">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    <span className="text-sm">{branch.location}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">Active</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold">Today's Revenue</p>
                                <p className="text-gray-900 font-bold">₦ 120,000</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold">Occupancy</p>
                                <p className="text-gray-900 font-bold">85%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold">Staff On Duty</p>
                                <p className="text-gray-900 font-bold">8</p>
                            </div>
                            <div className="flex justify-end items-center">
                                <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center">
                                    Details <ArrowRight className="w-4 h-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CeoBranches;
