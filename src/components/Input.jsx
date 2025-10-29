export default function Input({ label, error, ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full border p-3 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none ${
          error ? "border-red-500" : "border-gray-200 dark:border-gray-700"
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
