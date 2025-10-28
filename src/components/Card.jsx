import { Link } from "react-router-dom";

export default function Card({ post }) {
  return (
    <div className="border rounded p-4 shadow hover:shadow-md transition">
      <h2 className="font-bold text-lg">{post.title}</h2>
      <p className="text-gray-700 mt-2">{post.content.slice(0, 100)}...</p>
      <Link to={`/post/${post.$id}`} className="text-blue-500 mt-2 block">Read more</Link>
    </div>
  );
}
