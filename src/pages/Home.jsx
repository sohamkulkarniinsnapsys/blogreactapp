// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { getPosts } from "../services/appwrite";
import Card from "../components/Card";
import Spinner from "../components/Spinner";
import { Link } from "react-router-dom";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await getPosts();
        setPosts(p);
      } catch (err) {
        console.error("Home getPosts error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Latest posts</h1>
        <Link to="/dashboard" className="text-sm text-primary hover:underline">Go to Dashboard</Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <Card key={p.$id}>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{p.title}</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{p.content.slice(0, 140)}...</p>
              <Link to={`/post/${p.$id}`} className="text-primary hover:underline">Read more →</Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
