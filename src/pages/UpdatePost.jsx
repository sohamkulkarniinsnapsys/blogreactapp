import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, updatePost, getFileViewUrl } from "../services/appwrite";

export default function UpdatePost() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const post = await getPost(id);
        setTitle(post.title);
        setContent(post.content);
        setStatus(post.status || "draft");
        if (post.image) {
          setPreview(getFileViewUrl(post.image));
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        setError("Failed to load post.");
      }
    })();
  }, [id]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setLoading(true);
    try {
      await updatePost(id, title, content, file, status);
      navigate(`/post/${id}`);
    } catch (err) {
      console.error("Error updating post:", err);
      setError(err.message || "Failed to update post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Edit Post</h2>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
            placeholder="Enter post title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
            placeholder="Write your blog content..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
          >
            <option value="draft">Draft</option>
            <option value="publish">Publish</option>
            <option value="archive">Archive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Image</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="mt-4 w-full h-64 object-cover rounded-lg shadow"
            />
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            {loading ? "Updating..." : "Update Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
