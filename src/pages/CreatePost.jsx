import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPost, getCurrentUser } from "../services/appwrite";

export default function CreatePost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("draft");
  const [user, setUser] = useState(null);
  const contentRef = useRef(null);

  // Active styles state
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
  });

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) return navigate("/login");
      setUser(currentUser);
    })();
  }, [navigate]);

  // Update toolbar active states
  const updateActiveStyles = () => {
    setActiveStyles({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      list: document.queryCommandState("insertUnorderedList"),
    });
  };

  const execCommand = (command) => {
    contentRef.current.focus(); // Ensure focus
    document.execCommand(command, false, null);
    updateActiveStyles();
  };

  // Insert bullet at cursor
  const insertBullet = () => {
    if (!contentRef.current) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const bullet = '\u2022 '; // Unicode bullet
    const node = document.createTextNode(bullet);
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
    setContent(contentRef.current.innerHTML);
  };

  // Handle Enter key for bullets
  const handleKeyDown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // prevent default Enter behavior

    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const bulletLine = document.createElement("div");
    bulletLine.textContent = "\u2022 "; // bullet character
    range.insertNode(bulletLine);

    const newRange = document.createRange();
    newRange.setStart(bulletLine, 1); // after bullet
    newRange.collapse(true);

    sel.removeAllRanges();
    sel.addRange(newRange);
    
    setContent(contentRef.current.innerHTML);
  }
};


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

        {/* Content with Rich Text */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Content
          </label>

          {/* Formatting Toolbar */}
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              style={{ cursor: 'pointer' }}
              onClick={() => execCommand("bold")}
              className={`px-2 py-1 border rounded ${activeStyles.bold ? "bg-gray-300 dark:bg-gray-600" : ""}`}
            >
              B
            </button>
            <button
              type="button"
              style={{ cursor: 'pointer' }}
              onClick={() => execCommand("italic")}
              className={`px-2 py-1 border rounded ${activeStyles.italic ? "bg-gray-300 dark:bg-gray-600" : ""}`}
            >
              I
            </button>
            <button
              type="button"
              style={{ cursor: 'pointer' }}
              onClick={() => execCommand("underline")}
              className={`px-2 py-1 border rounded ${activeStyles.underline ? "bg-gray-300 dark:bg-gray-600" : ""}`}
            >
              U
            </button>
            <button
              type="button"
              style={{ cursor: 'pointer' }}
              onClick={insertBullet}
              className={`px-2 py-1 border rounded ${activeStyles.list ? "bg-gray-300 dark:bg-gray-600" : ""}`}
            >
              • List
            </button>
          </div>

          {/* Editable div */}
          <div
            ref={contentRef}
            contentEditable
            onInput={(e) => setContent(e.currentTarget.innerHTML)}
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveStyles}
            onMouseUp={updateActiveStyles}
            className="w-full p-3 border rounded-lg min-h-[200px] bg-gray-50 dark:bg-gray-700 dark:text-white overflow-auto"
            placeholder="Write your blog content..."
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Image
          </label>
          <input
            type="file"
            style={{ cursor: 'pointer' }}
            accept="image/*"
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
