export default function Input({ label, ...props }) {
  return (
    <div className="flex flex-col mb-3">
      {label && <label className="mb-1 font-semibold">{label}</label>}
      <input
        {...props}
        className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}
