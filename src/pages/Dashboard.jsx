// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { getCurrentUser, getPosts, deletePost, getFileViewUrl } from "../services/appwrite";
import { Link, useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (!currentUser) navigate("/login");
        const fetchedPosts = await getPosts();
        // Only show the logged-in user's posts
        const myPosts = fetchedPosts.filter(p => p.userID === currentUser?.$id);
        setPosts(myPosts);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.$id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete post");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Dashboard</h1>
          {user && <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome, {user.name}</p>}
        </div>
        <Link
          to="/create-post"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          ➕ Create New Post
        </Link>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {posts.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300 text-center">You haven’t created any posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <div key={p.$id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow hover:shadow-lg transition">
              {p.image && (
                <img
                  src={getFileViewUrl(p.image)}
                  alt={p.title}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {p.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                {p.content.slice(0, 120)}...
              </p>
              <div className="flex justify-between items-center text-sm">
                <Link
                  to={`/post/${p.$id}`}
                  className="text-blue-600 hover:underline"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(p.$id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
