import React from 'react';
import StaffTab from '../components/Staff/StaffTab';

const StaffView = () => (
    <div className="h-full flex flex-col bg-gray-900 overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-700/60 shrink-0">
            <h1 className="text-white font-bold text-lg">Staff Management</h1>
            <p className="text-gray-400 text-sm mt-0.5">Add and manage staff accounts and PIN codes</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
            <StaffTab />
        </div>
    </div>
);

export default StaffView;
