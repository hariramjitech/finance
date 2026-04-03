export const LoadingSpinner = ({ className = "py-12" }) => (
  <div className={`flex justify-center ${className}`}>
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);