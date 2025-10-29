// src/components/Card.jsx
export default function Card({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 hover:shadow-xl transition ${className}`}
    >
      {children}
    </div>
  );
}
