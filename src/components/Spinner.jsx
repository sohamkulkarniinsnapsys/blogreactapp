export default function Spinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="loader border-4 border-gray-300 border-t-primary rounded-full w-10 h-10 animate-spin" />
    </div>
  );
}
