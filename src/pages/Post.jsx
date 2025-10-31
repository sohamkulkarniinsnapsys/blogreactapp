import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPost, getFileViewUrl } from "../services/appwrite";
import PostContentRenderer from "../components/PostContentRenderer";

export default function Post() {
  const { id } = useParams();
  const [post, setPost] = useState(null);

  // Expand any __STORAGE_FILE__ placeholders by fetching their referenced files.
  const expandStoragePlaceholders = async (content) => {
    if (!content || typeof content !== "string") return content;

    // Find all placeholders like __STORAGE_FILE__<fileId>
    const regex = /__STORAGE_FILE__([A-Za-z0-9_\-]+)/g;
    const ids = new Set();
    let match;
    while ((match = regex.exec(content))) {
      ids.add(match[1]);
    }
    if (ids.size === 0) return content;

    // Fetch each file and replace placeholders. If a fetch fails, leave placeholder as-is.
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

          // Prefer text; content files produced by createPost are JSON/text/html
          const text = await resp.text();
          replacements[fileId] = text;
        } catch (err) {
          console.error("Error fetching storage file:", fileId, err);
        }
      })
    );

    // Replace placeholders in content
    let result = content;
    for (const [fileId, replacementText] of Object.entries(replacements)) {
      const placeholder = `__STORAGE_FILE__${fileId}`;
      result = result.split(placeholder).join(replacementText);
    }

    return result;
  };

  // ---- Normalization helpers ----
  const decodeHtmlEntities = (str = "") => {
    // Simple browser decode using a textarea — decodes &lt; &gt; &amp; etc.
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  };

  const looksLikeHtml = (s = "") => /<[^>]+>/.test(s);
  const looksLikeMarkdownHeadings = (s = "") => {
    // Checks for lines starting with 1-6 # followed by a space
    return /^#{1,6}\s+/m.test(s);
  };

  const convertMarkdownHeadingsToHtml = (s = "") => {
    // Convert only heading lines (# to ######). Keep other text as is.
    // This is intentionally small and focused only on heading conversion.
    return s.replace(/^######\s+(.+)$/gim, "<h6>$1</h6>")
            .replace(/^#####\s+(.+)$/gim, "<h5>$1</h5>")
            .replace(/^####\s+(.+)$/gim, "<h4>$1</h4>")
            .replace(/^###\s+(.+)$/gim, "<h3>$1</h3>")
            .replace(/^##\s+(.+)$/gim, "<h2>$1</h2>")
            .replace(/^#\s+(.+)$/gim, "<h1>$1</h1>");
  };

  // Optional sanitizer: if you add DOMPurify to your app, DOMPurify.sanitize will be used.
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
        if (!p) {
          if (mounted) setPost(null);
          return;
        }

        // If p.content contains placeholders, expand them (handles multiple placeholders).
        if (typeof p.content === "string" && p.content.includes("__STORAGE_FILE__")) {
          try {
            p.content = await expandStoragePlaceholders(p.content);
          } catch (err) {
            console.error("Failed to expand storage placeholders:", err);
            // leave p.content as-is (placeholder) so failure is visible in logs
          }
        }

        if (mounted) setPost(p);
      } catch (err) {
        console.error("getPost error:", err);
        if (mounted) setPost(null);
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

  if (!post) return <p className="p-4">Loading post...</p>;
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-900 min-h-screen">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        {post.title}
      </h1>
      <PostContentRenderer htmlContent={processedContent} />
    </div>
  );
}
