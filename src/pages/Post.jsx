import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { getPost, getFileViewUrl } from "../services/appwrite";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export default function Post() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const containerRef = useRef(null);

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

  // Render HTML and then convert mermaid blocks to SVG
  useEffect(() => {
    if (!post || !containerRef.current) return;

    const container = containerRef.current;
    // Clear previous
    container.innerHTML = "";

    const contentStr = typeof post.content === "string" ? post.content : "";

    // Normalize/prepare content for rendering:
    // 1) decode HTML entities (so "&lt;h1&gt;" => "<h1>")
    // 2) if it's Markdown headings, convert those lines to HTML headings
    // 3) otherwise if it's plain HTML, use it as-is
    let decoded = decodeHtmlEntities(contentStr);

    let renderable = decoded;

    // If decoded contains no tags but contains markdown headings, convert them
    if (!looksLikeHtml(decoded) && looksLikeMarkdownHeadings(decoded)) {
      renderable = convertMarkdownHeadingsToHtml(decoded);
    }

    // If after decode it looks like HTML, use as HTML; otherwise just insert text (or converted headings)
    // Sanitize if DOMPurify is available
    if (looksLikeHtml(renderable)) {
      container.innerHTML = sanitizeIfAvailable(renderable);
    } else {
      // safe fallback: insert as text container (but allow converted headings)
      container.innerHTML = sanitizeIfAvailable(renderable);
    }

    // helper to render a single mermaid code string into a container element
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

    // 1) Render wrappers like <div class="post-mermaid">...</div> (if present)
    const wrapperEls = Array.from(container.querySelectorAll(".post-mermaid"));
    wrapperEls.forEach((el, idx) => {
      const code = el.textContent || el.innerText || "";
      renderMermaidToElement(el, code, el.getAttribute("data-block-id") || `wrap-${idx}`);
    });

    // 2) Render code blocks saved as <pre><code class="language-mermaid">...</code></pre>
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

    // done
  }, [post]);

  if (!post) return <p className="p-4">Loading post...</p>;
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
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <div className="mt-4 prose dark:prose-invert max-w-none">
          {/* we render HTML into this ref and then post-process it for mermaid */}
          <div ref={containerRef} />
        </div>
      </div>
    </>
  );
}

// small helper to escape text when showing raw code in errors
function escapeHtml(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
