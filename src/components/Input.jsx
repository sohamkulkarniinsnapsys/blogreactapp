// src/components/Input.jsx
export default function Input({ label, ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{label}</label>}
      <input
        {...props}
        className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-md bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none"
      />
    </div>
  );
}
