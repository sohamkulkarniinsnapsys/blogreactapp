import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { createPost, getCurrentUser } from "../services/appwrite";
import { Editor } from "@tinymce/tinymce-react";
import { AuthContext } from "../context/AuthContext";

export default function CreatePost() {
  const navigate = useNavigate();
  const { user: contextUser } = useContext(AuthContext); // Get user from context

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("draft");

  // Loading and error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Local user state for safety
  const [user, setUser] = useState(contextUser);

  // If context user changes, update local user
  useEffect(() => {
    setUser(contextUser);
  }, [contextUser]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !content.trim() || !file) {
      setError("Title, content, and image are required.");
      return;
    }

    if (!user) {
      setError("User not loaded. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const newPost = await createPost(title, content, file, user.$id, status);
      navigate(`/post/${newPost.$id}`);
    } catch (err) {
      console.error("Error creating post:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        ✍️ Create a New Blog Post
      </h2>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
            placeholder="Enter post title"
            required
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Content
          </label>
          <Editor
            apiKey={import.meta.env.VITE_TINYMCE_KEY}
            value={content}
            onEditorChange={(newContent) => setContent(newContent)}
            init={{
              height: 400,
              skin: 'oxide-dark',
              content_css: "dark",
              plugins: [
                'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount'
            ],

              toolbar:
                'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
              tinycomments_mode: 'embedded',
              tinycomments_author: user?.name || "Author",
              mergetags_list: [
                { value: 'First.Name', title: 'First Name' },
                { value: 'Email', title: 'Email' },
              ],
              ai_request: (request, respondWith) =>
                respondWith.string(() => Promise.reject('AI Assistant not implemented')),
              uploadcare_public_key: 'defad1d9f23ff4a23fe2',
              content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
            }}
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Cover Image
          </label>
          <input
            type="file"
            accept="image/*"
            style={{ cursor: 'pointer' }}
            onChange={(e) => {
              const f = e.target.files[0];
              setFile(f);
              if (f) {
                const reader = new FileReader();
                reader.onloadend = () => setPreview(reader.result);
                reader.readAsDataURL(f);
              } else setPreview("");
            }}
            required
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="mt-4 w-full h-full object-cover rounded-lg shadow"
            />
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={status}
            style={{ cursor: 'pointer' }}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
          >
            <option value="draft">Draft</option>
            <option value="publish">Publish</option>
            <option value="archive">Archive</option>
          </select>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            {loading ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
