import React, { useEffect, useState } from "react";
import {
  getCurrentUser,
  getPosts,
  deletePost,
  updatePost,
  getFileViewUrl,
} from "../services/appwrite";
import { Link, useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";

// Helper to strip HTML tags from TinyMCE content
function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return navigate("/login");
        setUser(currentUser);

        const fetchedPosts = await getPosts({ userId: currentUser.$id });
        setPosts(fetchedPosts);
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
      setPosts((prev) => prev.filter((p) => p.$id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete post");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "publish":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const startEdit = (post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(stripHtml(post.content)); // Strip HTML for editing
    setEditStatus(post.status);
    setEditPreview(post.image ? getFileViewUrl(post.image) : "");
    setEditFile(null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setEditFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => setEditPreview(reader.result);
      reader.readAsDataURL(f);
    } else setEditPreview(editingPost.image ? getFileViewUrl(editingPost.image) : "");
  };

  const handleUpdate = async () => {
    if (!editingPost) return;
    try {
      const updated = await updatePost(
        editingPost.$id,
        editTitle,
        editContent,
        editFile,
        editStatus
      );
      setPosts((prev) => prev.map((p) => (p.$id === updated.$id ? updated : p)));
      setEditingPost(null);
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update post");
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
        <Link
          to="/create-post-enhanced"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          ➕ Create New Post Enhanced
        </Link>
      </div>

      

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {posts.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300 text-center">You haven’t created any posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <div
              key={p.$id}
              className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow hover:shadow-lg transition"
            >
              {p.image && (
                <img
                  src={getFileViewUrl(p.image)}
                  alt={p.title}
                  className="w-full h-auto object-cover rounded mb-3"
                />
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {p.title}
              </h3>
              <p
                className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getStatusColor(
                  p.status
                )} mb-2`}
              >
                {p.status?.toUpperCase() || "UNKNOWN"}
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                {stripHtml(p.content).slice(0, 120)}...
              </p>
              <div className="flex justify-between items-center text-sm">
                <button style={{ cursor: 'pointer' }} onClick={() => startEdit(p)} className="text-yellow-600 hover:underline">
                  Edit
                </button>
                <button style={{ cursor: 'pointer' }} onClick={() => handleDelete(p.$id)} className="text-red-600 hover:underline ">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Edit Post</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Content
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Image
                </label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {editPreview && (
                  <img
                    src={editPreview}
                    alt="Preview"
                    className="mt-2 w-full h-48 object-cover rounded"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="publish">Publish</option>
                  <option value="archive">Archive</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
