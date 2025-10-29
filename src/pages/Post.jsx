import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPost } from "../services/appwrite";

export default function Post() {
  const { id } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    getPost(id).then(setPost);
  }, [id]);

  if (!post) return <p className="p-4">Loading post...</p>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div
        className="mt-4 prose dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.content }}
      ></div>
    </div>
  );
}
