// src/pages/Dashboard.jsx
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { createPost, getPosts, deletePost, updatePost } from "../services/appwrite";
import Input from "../components/Input";
import Button from "../components/Button";
import Card from "../components/Card";
import Spinner from "../components/Spinner";

export default function Dashboard() {
  const { user, checking } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const p = await getPosts();
      setPosts(p);
    } catch (err) {
      console.error("getPosts error:", err);
    }
  };

  useEffect(() => {
    (async () => {
      if (!checking) {
        setLoading(true);
        await refresh();
        setLoading(false);
      }
    })();
  }, [checking]);

  if (checking || loading) return <Spinner />;

  const handleCreateOrUpdate = async () => {
    if (!title.trim() || !content.trim()) return alert("Title and content required");
    setBusy(true);
    try {
      if (editingId) {
        await updatePost(editingId, title, content);
        setEditingId(null);
      } else {
        await createPost(title, content);
      }
      setTitle("");
      setContent("");
      await refresh();
    } catch (err) {
      console.error("create/update error:", err);
      alert("Operation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (post) => {
    setEditingId(post.$id);
    setTitle(post.title);
    setContent(post.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    try {
      await deletePost(id);
      await refresh();
    } catch (err) {
      console.error("delete error:", err);
      alert("Delete failed");
    }
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              {editingId ? "Edit Post" : "Create Post"}
            </h2>
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Content" value={content} onChange={(e) => setContent(e.target.value)} />
            <Button onClick={handleCreateOrUpdate} disabled={busy}>
              {busy ? "Saving..." : editingId ? "Update Post" : "Create Post"}
            </Button>
            {editingId && (
              <button onClick={() => { setEditingId(null); setTitle(""); setContent(""); }} className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                Cancel edit
              </button>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">All Posts</h2>
          {posts.length === 0 ? <p className="text-gray-700 dark:text-gray-300">No posts yet.</p> : (
            <div className="space-y-4">
              {posts.map((p) => (
                <Card key={p.$id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{p.title}</h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{p.content.slice(0, 200)}...</p>
                    </div>
                    <div className="shrink-0 flex flex-col gap-2 ml-4">
                      <button onClick={() => handleEdit(p)} className="text-sm text-primary">Edit</button>
                      <button onClick={() => handleDelete(p.$id)} className="text-sm text-red-500">Delete</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
