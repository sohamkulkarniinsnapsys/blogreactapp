import { useEffect, useState } from "react";
import { createPost, getPosts, deletePost } from "../services/appwrite";
import { useForm } from "react-hook-form";
import Input from "../components/Input";
import Button from "../components/Button";
import Card from "../components/Card";

export default function Dashboard() {
  const { register, handleSubmit, reset } = useForm();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    const data = await getPosts();
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onSubmit = async (data) => {
    await createPost(data.title, data.content);
    reset();
    fetchPosts();
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure?")) {
      await deletePost(id);
      fetchPosts();
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
        <Input label="Title" {...register("title")} />
        <Input label="Content" {...register("content")} />
        <Button type="submit">Create Post</Button>
      </form>

      {loading ? (
        <p>Loading posts...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div key={post.$id} className="relative">
              <Card post={post} />
              <button
                onClick={() => handleDelete(post.$id)}
                className="absolute top-2 right-2 text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
