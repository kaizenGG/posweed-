import React from 'react';

interface PageLoaderProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

const PageLoader: React.FC<PageLoaderProps> = ({ isLoading = false, children }) => {
  return (
    <div className="relative min-h-[200px]">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-2"></div>
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      )}
      <div className={isLoading ? "opacity-50" : "page-entry"}>
        {children}
      </div>
    </div>
  );
};

export default PageLoader; 