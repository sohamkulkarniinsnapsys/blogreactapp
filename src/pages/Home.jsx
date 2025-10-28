import { useEffect, useState } from "react";
import { getPosts } from "../services/appwrite";
import Card from "../components/Card";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPosts().then(setPosts).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4">Loading posts...</p>;

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {posts.map(post => <Card key={post.$id} post={post} />)}
    </div>
  );
}
