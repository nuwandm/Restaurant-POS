import React from 'react';

const LoadingSpinner = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 border-blue-600`}></div>
        </div>
    );
};

export default LoadingSpinner;