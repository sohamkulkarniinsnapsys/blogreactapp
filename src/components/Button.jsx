export default function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
