import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPost, getFileViewUrl } from "../services/appwrite";
import Spinner from "../components/Spinner";
import PostContentRenderer from "../components/PostContentRenderer";

export default function PostDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // Expand placeholders similar to Post.jsx (supports multiple placeholders)
  const expandStoragePlaceholders = async (content) => {
    if (!content || typeof content !== "string") return content;
    const regex = /__STORAGE_FILE__([A-Za-z0-9_\-]+)/g;
    const ids = new Set();
    let match;
    while ((match = regex.exec(content))) {
      ids.add(match[1]);
    }
    if (ids.size === 0) return content;

    const replacements = {};
    await Promise.all(
      Array.from(ids).map(async (fileId) => {
        try {
          const fileUrl = getFileViewUrl(fileId);
          if (!fileUrl) return;
          const resp = await fetch(fileUrl);
          if (!resp.ok) {
            console.warn(`Failed to fetch storage file ${fileId}: ${resp.status}`);
            return;
          }
          const text = await resp.text();
          replacements[fileId] = text;
        } catch (err) {
          console.error("Error fetching storage file:", fileId, err);
        }
      })
    );

    let result = content;
    for (const [fileId, replacementText] of Object.entries(replacements)) {
      const placeholder = `__STORAGE_FILE__${fileId}`;
      result = result.split(placeholder).join(replacementText);
    }
    return result;
  };

  // ---- Normalization helpers (same as Post.jsx) ----
  const decodeHtmlEntities = (str = "") => {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  };

  const looksLikeHtml = (s = "") => /<[^>]+>/.test(s);
  const looksLikeMarkdownHeadings = (s = "") => /^#{1,6}\s+/m.test(s);

  const convertMarkdownHeadingsToHtml = (s = "") => {
    return s.replace(/^######\s+(.+)$/gim, "<h6>$1</h6>")
            .replace(/^#####\s+(.+)$/gim, "<h5>$1</h5>")
            .replace(/^####\s+(.+)$/gim, "<h4>$1</h4>")
            .replace(/^###\s+(.+)$/gim, "<h3>$1</h3>")
            .replace(/^##\s+(.+)$/gim, "<h2>$1</h2>")
            .replace(/^#\s+(.+)$/gim, "<h1>$1</h1>");
  };

  const sanitizeIfAvailable = (html) => {
    if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
      return window.DOMPurify.sanitize(html);
    }
    return html;
  };

  // ---- End helpers ----

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let p = await getPost(id);

        // If backend didn't already expand storage-file placeholder, fetch it here
        if (p?.content && typeof p.content === "string" && p.content.includes("__STORAGE_FILE__")) {
          try {
            p.content = await expandStoragePlaceholders(p.content);
          } catch (err) {
            console.error("Failed to expand storage placeholders:", err);
          }
        }

        if (mounted) setPost(p);
      } catch (err) {
        console.error("getPost error:", err);
        if (mounted) setPost(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Process content for rendering
  const processedContent = React.useMemo(() => {
    if (!post?.content) return "";
    
    const contentStr = typeof post.content === "string" ? post.content : "";
    let decoded = decodeHtmlEntities(contentStr);
    
    // If decoded contains no tags but contains markdown headings, convert them
    if (!looksLikeHtml(decoded) && looksLikeMarkdownHeadings(decoded)) {
      decoded = convertMarkdownHeadingsToHtml(decoded);
    }
    
    return sanitizeIfAvailable(decoded);
  }, [post]);

  if (loading) return <Spinner />;
  if (!post) return <div className="p-8">Post not found</div>;

  return (
    <div className="container mx-auto px-6 py-10 max-w-4xl bg-white dark:bg-gray-900 min-h-screen">
      {post.image && (
        <img
          src={getFileViewUrl(post.image)}
          alt={post.title}
          className="w-full h-64 object-cover rounded-lg mb-8"
        />
      )}
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        {post.title}
      </h1>
      <PostContentRenderer htmlContent={processedContent} />
    </div>
  );
}
