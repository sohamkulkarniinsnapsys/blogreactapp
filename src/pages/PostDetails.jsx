import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { getPost, getFileViewUrl } from "../services/appwrite";
import Spinner from "../components/Spinner";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export default function PostDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

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

  // Mermaid processing: render saved HTML then run mermaid.render for mermaid blocks
  useEffect(() => {
    if (!post || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    const contentStr = typeof post.content === "string" ? post.content : "";
    // decode first so we can detect mermaid/plain/html properly
    let decoded = decodeHtmlEntities(contentStr);

    // If it looks like markdown headings (but no HTML), convert them
    let renderable = decoded;
    if (!looksLikeHtml(decoded) && looksLikeMarkdownHeadings(decoded)) {
      renderable = convertMarkdownHeadingsToHtml(decoded);
    }

    const trimmed = renderable.trim();

    const looksLikeMermaid = (() => {
      if (!trimmed) return false;
      // If we have HTML tags, it's not a plain mermaid block
      const hasHtmlTags = /<[^>]+>/.test(trimmed);
      if (hasHtmlTags) return false;
      const mermaidKeywords = [
        "graph",
        "flowchart",
        "sequenceDiagram",
        "classDiagram",
        "stateDiagram",
        "erDiagram",
        "gantt",
        "pie",
        "gitGraph",
        "journey",
      ];
      const firstLine = trimmed.split("\n", 1)[0].toLowerCase();
      return mermaidKeywords.some((k) => firstLine.startsWith(k) || trimmed.startsWith(k));
    })();

    if (looksLikeMermaid) {
      const wrapper = document.createElement("div");
      wrapper.className = "post-mermaid";
      wrapper.textContent = contentStr; // use original raw content (mermaid code) for rendering
      container.appendChild(wrapper);
    } else {
      // If renderable contains HTML tags, treat them as HTML; otherwise insert as text / converted headings.
      if (looksLikeHtml(renderable)) {
        container.innerHTML = sanitizeIfAvailable(renderable);
      } else {
        container.innerHTML = sanitizeIfAvailable(renderable);
      }
    }

    const renderMermaidToElement = async (targetEl, code, idHint = "") => {
      const id = `mermaid-${idHint || Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      try {
        const result = await mermaid.render(id, code);
        const svg = (result && result.svg) || result;
        targetEl.innerHTML = svg;
      } catch (err) {
        console.error("Mermaid render error:", err);
        const escaped = escapeHtml(code);
        targetEl.innerHTML =
          `<div style="color: #b91c1c; font-weight:600; margin-bottom:6px;">Mermaid render error</div>` +
          `<pre style="white-space:pre-wrap; background:#111827; color:#f3f4f6; padding:12px; border-radius:6px;">${escaped}</pre>`;
      }
    };

    const wrapperEls = Array.from(container.querySelectorAll(".post-mermaid"));
    wrapperEls.forEach((el, idx) => {
      const code = el.textContent || el.innerText || "";
      renderMermaidToElement(el, code, el.getAttribute("data-block-id") || `wrap-${idx}`);
    });

    const codeEls = Array.from(container.querySelectorAll("pre > code.language-mermaid, code.language-mermaid"));
    codeEls.forEach((codeEl, idx) => {
      const code = codeEl.textContent || codeEl.innerText || "";
      const pre = codeEl.closest("pre") || codeEl;
      const placeholder = document.createElement("div");
      placeholder.className = "post-mermaid-rendered";
      placeholder.style.width = "100%";
      placeholder.style.overflow = "auto";
      pre.parentNode.replaceChild(placeholder, pre);
      renderMermaidToElement(placeholder, code, `code-${idx}`);
    });
  }, [post]);

  if (loading) return <Spinner />;
  if (!post) return <div className="p-8">Post not found</div>;

  return (
    <>
      <style>{`
        /* Heading styles */
        .prose h1 {
          font-size: 1.875rem !important; /* 3xl */
          font-weight: 700 !important;
          line-height: 2.25rem !important;
          margin-top: 1.5rem !important;
          margin-bottom: 1rem !important;
          color: #111827;
        }
        .prose h2 {
          font-size: 1.5rem !important; /* 2xl */
          font-weight: 600 !important;
          line-height: 2rem !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.75rem !important;
          color: #111827;
        }
        .prose h3 {
          font-size: 1.25rem !important; /* xl */
          font-weight: 500 !important;
          line-height: 1.75rem !important;
          margin-top: 1rem !important;
          margin-bottom: 0.5rem !important;
          color: #111827;
        }
        
        /* Dark mode headings */
        .dark .prose h1,
        .dark .prose h2,
        .dark .prose h3 {
          color: #f9fafb !important;
        }
        
        /* Table styling */
        .prose table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 16px 0 !important;
          display: table !important;
        }
        .prose table th,
        .prose table td {
          border: 1px solid #d1d5db !important;
          padding: 12px !important;
          text-align: left !important;
          background-color: white !important;
          color: #111827 !important;
        }
        .prose table th {
          background-color: #f3f4f6 !important;
          font-weight: 600 !important;
          color: #111827 !important;
        }
        .dark .prose table th,
        .dark .prose table td {
          border-color: #4b5563 !important;
          background-color: #1f2937 !important;
          color: #f9fafb !important;
        }
        .dark .prose table th {
          background-color: #374151 !important;
          color: #f9fafb !important;
        }
        
        /* Blockquote styling */
        .prose blockquote {
          border-left: 4px solid #9ca3af !important;
          padding-left: 16px !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
          margin: 16px 0 !important;
          font-size: 1.125rem !important;
          font-style: italic !important;
          color: #4b5563 !important;
          background-color: transparent !important;
        }
        .dark .prose blockquote {
          border-left-color: #6b7280 !important;
          color: #d1d5db !important;
        }
        
        /* Callout styling - ensure visibility */
        .prose > div[style*="border-left"][style*="background-color"] {
          display: flex !important;
          gap: 12px !important;
          padding: 16px !important;
          border-radius: 8px !important;
          margin: 16px 0 !important;
        }
        .prose > div[style*="border-left"] > div {
          flex: 1 !important;
          color: #111827 !important;
        }
        .dark .prose > div[style*="border-left"] > div {
          color: #f9fafb !important;
        }
        
        /* List styling */
        .prose ul,
        .prose ol {
          padding-left: 1.5rem !important;
          margin: 0.75rem 0 !important;
          list-style-position: outside !important;
        }
        .prose ul {
          list-style-type: disc !important;
        }
        .prose ol {
          list-style-type: decimal !important;
        }
        .prose ul li,
        .prose ol li {
          margin: 0.5rem 0 !important;
          color: #111827 !important;
        }
        .dark .prose ul li,
        .dark .prose ol li {
          color: #f9fafb !important;
        }
        
        /* Code block styling */
        .prose pre {
          background-color: #1f2937 !important;
          color: #f3f4f6 !important;
          padding: 16px !important;
          border-radius: 8px !important;
          overflow-x: auto !important;
          margin: 16px 0 !important;
        }
        .prose pre code {
          background: transparent !important;
          padding: 0 !important;
          color: #f3f4f6 !important;
          font-family: 'Courier New', monospace !important;
        }
        
        /* Figure/Image styling */
        .prose figure {
          text-align: center !important;
          margin: 16px 0 !important;
        }
        .prose figure img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 8px !important;
          display: inline-block !important;
        }
        .prose figure figcaption {
          font-size: 0.9em !important;
          color: #6b7280 !important;
          margin-top: 8px !important;
          text-align: center !important;
          font-style: italic !important;
        }
        .dark .prose figure figcaption {
          color: #9ca3af !important;
        }
        
        /* Paragraph styling */
        .prose p {
          margin: 0.75rem 0 !important;
          color: #374151 !important;
          line-height: 1.75 !important;
        }
        .dark .prose p {
          color: #d1d5db !important;
        }
        
        /* TOC styling */
        .prose > div[style*="background-color: #f9fafb"] {
          background-color: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          padding: 16px !important;
          margin: 16px 0 !important;
        }
        .dark .prose > div[style*="background-color: #f9fafb"] {
          background-color: #1f2937 !important;
          border-color: #374151 !important;
        }
        .prose > div[style*="background-color: #f9fafb"] div {
          color: #111827 !important;
        }
        .dark .prose > div[style*="background-color: #f9fafb"] div {
          color: #f9fafb !important;
        }
      `}</style>
      <div className="container mx-auto px-6 py-10 max-w-3xl">
        {post.image && (
          <img
            src={getFileViewUrl(post.image)}
            alt={post.title}
            className="w-full h-full object-cover rounded mb-6"
          />
        )}
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">{post.title}</h1>
        <div className="prose dark:prose-invert max-w-none">
          {/* render content into ref then post-process for mermaid */}
          <div ref={containerRef} />
        </div>
      </div>
    </>
  );
}

function escapeHtml(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
