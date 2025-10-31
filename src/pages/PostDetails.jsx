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
    const trimmed = contentStr.trim();

    const looksLikeMermaid = (() => {
      if (!trimmed) return false;
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
      wrapper.textContent = contentStr;
      container.appendChild(wrapper);
    } else {
      container.innerHTML = contentStr;
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
    <div className="container mx-auto px-6 py-10 max-w-3xl">
      {post.image && (
        <img
          src={getFileViewUrl(post.image)}
          alt={post.title}
          className="w-full h-full object-cover rounded mb-6"
        />
      )}
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">{post.title}</h1>
      <div className="prose dark:prose-invert">
        {/* render content into ref then post-process for mermaid */}
        <div ref={containerRef} />
      </div>
    </div>
  );
}

function escapeHtml(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
