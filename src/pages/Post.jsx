// src/pages/Post.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { getPost } from "../services/appwrite";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export default function Post() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getPost(id)
      .then((p) => {
        if (mounted) setPost(p);
      })
      .catch((err) => {
        console.error("getPost error:", err);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  // Render HTML and then convert mermaid blocks to SVG
  useEffect(() => {
    if (!post || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = post.content || "";

    // helper to render a single mermaid code string into a container element
    const renderMermaidToElement = async (targetEl, code, idHint = "") => {
      const id = `mermaid-${idHint || Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      try {
        const result = await mermaid.render(id, code);
        // support both older and newer return shapes
        const svg = (result && result.svg) || result;
        targetEl.innerHTML = svg;
      } catch (err) {
        console.error("Mermaid render error:", err);
        // keep the original code visible and show an inline message
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
      // render into the wrapper element itself
      renderMermaidToElement(el, code, el.getAttribute("data-block-id") || `wrap-${idx}`);
    });

    // 2) Render code blocks saved as <pre><code class="language-mermaid">...</code></pre>
    const codeEls = Array.from(container.querySelectorAll("pre > code.language-mermaid, code.language-mermaid"));
    codeEls.forEach((codeEl, idx) => {
      const code = codeEl.textContent || codeEl.innerText || "";
      // prefer replacing the whole <pre> (if exists) to avoid leftover styling
      const pre = codeEl.closest("pre") || codeEl;
      // create a placeholder div to receive the svg (keeps layout)
      const placeholder = document.createElement("div");
      placeholder.className = "post-mermaid-rendered";
      placeholder.style = "width:100%; overflow:auto;";
      // replace pre with placeholder, then render into it
      pre.parentNode.replaceChild(placeholder, pre);
      renderMermaidToElement(placeholder, code, `code-${idx}`);
    });

    // done
  }, [post]);

  if (!post) return <p className="p-4">Loading post...</p>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div className="mt-4 prose dark:prose-invert">
        {/* we render HTML into this ref and then post-process it for mermaid */}
        <div ref={containerRef} />
      </div>
    </div>
  );
}

// small helper to escape text when showing raw code in errors
function escapeHtml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
