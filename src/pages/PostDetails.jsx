// src/pages/PostDetails.jsx
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

  useEffect(() => {
    (async () => {
      try {
        const p = await getPost(id);
        setPost(p);
      } catch (err) {
        console.error("getPost error:", err);
        setPost(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Same mermaid processing as Post.jsx — render saved HTML then run mermaid.render for mermaid blocks
  useEffect(() => {
    if (!post || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = post.content || "";

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
      placeholder.style = "width:100%; overflow:auto;";
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
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        {post.title}
      </h1>
      <div className="prose dark:prose-invert">
        {/* render content into ref then post-process for mermaid */}
        <div ref={containerRef} />
      </div>
    </div>
  );
}

function escapeHtml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
