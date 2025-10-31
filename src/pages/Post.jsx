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
      // Normal path: content is HTML (or plain text mixed). Insert as HTML.
      container.innerHTML = contentStr;
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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
