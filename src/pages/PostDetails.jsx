import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPost } from "../services/appwrite";
import Spinner from "../components/Spinner";
import { getFileViewUrl } from "../services/appwrite";


export default function PostDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await getPost(id);
        setPost(p);
      } catch (err) {
        console.error("getPost error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spinner />;
  if (!post) return <div className="p-8">Post not found</div>;

  return (
    <div className="container mx-auto px-6 py-10 max-w-3xl">
      {post.image && (
        <img
          src={getFileViewUrl(post.image)}
          alt={post.title}
          className="w-full h-full object-cover rounded mb-6"
        />
      )}
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">{post.title}</h1>
      <div className="prose dark:prose-invert">
        dangerouslySetInnerHTML={{ __html: post.content }}
      </div>
    </div>
  );
}
