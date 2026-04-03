export const Input = ({ label, error, ...props }) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 ${error ? "border-red-500" : "border-gray-300"
        } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);