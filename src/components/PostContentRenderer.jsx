import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export default function PostContentRenderer({ htmlContent }) {
  const containerRef = useRef(null);
  const mermaidRefs = useRef({});

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = "";

    if (!htmlContent || htmlContent.trim() === "") {
      container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">No content available</p>';
      return;
    }

    // Parse HTML string into DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    let elements = Array.from(doc.body.children);

    // Ensure headings (h1/h2/h3) have stable IDs so TOC links can target them.
    // Generate slugified IDs for headings without one.
    const slugify = (str) =>
      String(str)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-")
        .replace(/^-+|-+$/g, "");

    const headingNodes = Array.from(doc.querySelectorAll("h1, h2, h3"));
    if (headingNodes.length > 0) {
      headingNodes.forEach((h, i) => {
        if (!h.id) {
          const base = slugify(h.textContent || `heading-${i}`);
          // Guarantee uniqueness: include index + timestamp
          h.id = `${base || "heading"}-${i}-${Date.now().toString(36)}`;
        }
      });
      // Refresh elements because doc nodes have changed (though same references, keep consistent)
      elements = Array.from(doc.body.children);
    }

    // helper: render mermaid in an already injected container
    const renderMermaidInContainer = async (root) => {
      try {
        const codeEls = Array.from(root.querySelectorAll("pre > code.language-mermaid, code.language-mermaid"));
        for (let i = 0; i < codeEls.length; i++) {
          const codeEl = codeEls[i];
          const code = codeEl.textContent || codeEl.innerText || "";
          const pre = codeEl.closest("pre") || codeEl;
          const placeholder = document.createElement("div");
          placeholder.className = "post-mermaid-rendered";
          placeholder.style.width = "100%";
          placeholder.style.overflow = "auto";
          pre.parentNode.replaceChild(placeholder, pre);
          try {
            const { svg } = await mermaid.render(`mermaid-fallback-${i}-${Date.now()}`, code);
            placeholder.innerHTML = svg;
          } catch (err) {
            console.error("Mermaid render error (fallback):", err);
            placeholder.innerHTML = `
              <div class="text-red-600 dark:text-red-400 font-semibold mb-2">Mermaid render error</div>
              <pre class="bg-gray-800 text-gray-100 p-3 rounded text-sm overflow-x-auto">${code}</pre>
            `;
          }
        }
      } catch (e) {
        console.error("renderMermaidInContainer failed", e);
      }
    };

    if (elements.length === 0) {
      // Fallback: inject raw HTML directly, then post-process Mermaid
      const raw = (doc.body && doc.body.innerHTML) || htmlContent;
      container.innerHTML = raw;
      // Post-process Mermaid diagrams if present
      renderMermaidInContainer(container);
      return;
    }

    elements.forEach((element, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "block-wrapper";

      // Helper to get or generate the id for this element (use id already in doc if present)
      const getHeadingId = (el, fallbackIndex) => {
        const existing = el.getAttribute && el.getAttribute("id");
        if (existing) return existing;
        // Shouldn't happen because we generated ids above; fallback generation:
        const base = slugify(el.textContent || `heading-${fallbackIndex}`);
        return `${base || "heading"}-${fallbackIndex}-${Date.now().toString(36)}`;
      };

      // Handle different block types
      if (element.tagName === "H1") {
        const id = getHeadingId(element, index);
        wrapper.innerHTML = `<h1 id="${id}" class="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100">${element.innerHTML}</h1>`;
      } else if (element.tagName === "H2") {
        const id = getHeadingId(element, index);
        wrapper.innerHTML = `<h2 id="${id}" class="text-2xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100">${element.innerHTML}</h2>`;
      } else if (element.tagName === "H3") {
        const id = getHeadingId(element, index);
        wrapper.innerHTML = `<h3 id="${id}" class="text-xl font-medium mt-4 mb-2 text-gray-900 dark:text-gray-100">${element.innerHTML}</h3>`;
      } else if (element.tagName === "P") {
        wrapper.innerHTML = `<p class="my-3 text-gray-700 dark:text-gray-300 leading-relaxed">${element.innerHTML}</p>`;
      } else if (element.tagName === "BLOCKQUOTE") {
        wrapper.innerHTML = `
          <blockquote class="border-l-4 border-gray-400 dark:border-gray-600 pl-4 py-2 my-4 text-lg italic text-gray-700 dark:text-gray-300">
            ${element.innerHTML}
          </blockquote>
        `;
      } else if (element.tagName === "UL") {
        wrapper.innerHTML = `<ul class="list-disc list-outside pl-6 my-3 space-y-1 text-gray-700 dark:text-gray-300">${element.innerHTML}</ul>`;
      } else if (element.tagName === "OL") {
        wrapper.innerHTML = `<ol class="list-decimal list-outside pl-6 my-3 space-y-1 text-gray-700 dark:text-gray-300">${element.innerHTML}</ol>`;
      } else if (element.tagName === "TABLE") {
        const tableHTML = `
          <div class="overflow-x-auto my-4">
            <table class="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
              ${Array.from(element.querySelectorAll("tr"))
                .map((row) => {
                  const cells = Array.from(row.children);
                  return `
                    <tr class="border-b border-gray-300 dark:border-gray-600">
                      ${cells
                        .map((cell) => {
                          const isHeader = cell.tagName === "TH";
                          const classes = isHeader
                            ? "border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-left text-gray-900 dark:text-gray-100"
                            : "border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300";
                          return `<${cell.tagName.toLowerCase()} class="${classes}">${cell.innerHTML}</${cell.tagName.toLowerCase()}>`;
                        })
                        .join("")}
                    </tr>
                  `;
                })
                .join("")}
            </table>
          </div>
        `;
        wrapper.innerHTML = tableHTML;
      } else if (element.tagName === "FIGURE") {
        const img = element.querySelector("img");
        const caption = element.querySelector("figcaption");
        wrapper.innerHTML = `
          <figure class="my-6 text-center">
            <img src="${img?.src || ""}" alt="${img?.alt || ""}" class="max-w-full h-auto rounded-lg mx-auto" />
            ${caption ? `<figcaption class="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">${caption.innerHTML}</figcaption>` : ""}
          </figure>
        `;
      } else if (element.tagName === "PRE") {
        const code = element.querySelector("code");
        const language = code?.className?.match(/language-(\w+)/)?.[1] || "plaintext";

        if (language === "mermaid") {
          // Mermaid diagram
          const mermaidCode = code.textContent;
          const mermaidId = `mermaid-${index}-${Date.now()}`;
          wrapper.innerHTML = `<div class="my-6 flex justify-center items-center overflow-x-auto bg-white dark:bg-gray-900 p-4 rounded-lg"><div id="${mermaidId}" class="mermaid-container"></div></div>`;
          container.appendChild(wrapper);

          // Render mermaid after appending
          setTimeout(async () => {
            try {
              const mermaidContainer = document.getElementById(mermaidId);
              if (mermaidContainer) {
                const { svg } = await mermaid.render(`mermaid-svg-${mermaidId}`, mermaidCode);
                mermaidContainer.innerHTML = svg;
              }
            } catch (err) {
              console.error("Mermaid render error:", err);
              const mermaidContainer = document.getElementById(mermaidId);
              if (mermaidContainer) {
                mermaidContainer.innerHTML = `
                  <div class="text-red-600 dark:text-red-400 font-semibold mb-2">Mermaid render error</div>
                  <pre class="bg-gray-800 text-gray-100 p-3 rounded text-sm overflow-x-auto">${mermaidCode}</pre>
                `;
              }
            }
          }, 0);
          return; // Skip normal append
        } else {
          // Regular code block
          wrapper.innerHTML = `
            <pre class="my-4 bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code class="language-${language} text-sm font-mono">${code.innerHTML}</code>
            </pre>
          `;
        }
      } else if (element.tagName === "DIV") {
        // Check if it's a callout
        const style = element.getAttribute("style") || "";
        if (style.includes("border-left") && style.includes("background-color")) {
          // Callout block
          const bgColor = style.match(/background-color:\s*([^;]+)/)?.[1]?.trim();
          const borderColor = style.match(/border-left:.*?solid\s+([^;]+)/)?.[1]?.trim();

          let bgClass = "bg-gray-50 dark:bg-gray-800 border-gray-500";
          if (bgColor?.includes("eff6ff")) bgClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-500";
          else if (bgColor?.includes("fefce8")) bgClass = "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500";
          else if (bgColor?.includes("fef2f2")) bgClass = "bg-red-50 dark:bg-red-900/20 border-red-500";
          else if (bgColor?.includes("f0fdf4")) bgClass = "bg-green-50 dark:bg-green-900/20 border-green-500";

          const icon = element.querySelector("span")?.textContent || "💡";
          const content = element.querySelector("div")?.innerHTML || "";

          wrapper.innerHTML = `
            <div class="flex gap-3 p-4 rounded-lg border-l-4 ${bgClass} my-4">
              <div class="text-2xl shrink-0">${icon}</div>
              <div class="flex-1 text-gray-800 dark:text-gray-200">${content}</div>
            </div>
          `;
        } else if (style.includes("background-color: #f9fafb") || style.includes("background-color:#f9fafb")) {
          // TOC block — build anchors by scanning the full parsed doc for headings (h1,h2,h3)
          // We already ensured headings in `doc` have ids above.
          const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));

          const tocItems = headings
            .map((h) => {
              const level = h.tagName.toLowerCase() === "h1" ? 1 : h.tagName.toLowerCase() === "h2" ? 2 : 3;
              const text = (h.textContent || "").trim() || "(Empty heading)";
              const indentPx = (level - 1) * 12;
              const id = h.getAttribute("id");
              // Escape id when inserting into href if CSS.escape is available
              return `<div style="margin-left:${indentPx}px"><a href="#${id}" class="toc-link text-sm hover:text-blue-600 inline-block">${text}</a></div>`;
            })
            .join("");

          wrapper.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 my-4">
              <div class="flex items-center gap-2 mb-3">
                <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span class="font-semibold text-gray-700 dark:text-gray-300">Table of Contents</span>
              </div>
              <div class="space-y-2 text-gray-700 dark:text-gray-300">
                ${tocItems || "<div class='text-sm italic text-gray-400'>No headings found in this post.</div>"}
              </div>
            </div>
          `;
          // Append wrapper first so the TOC is visible in the order it appears
          const appended = container.appendChild(wrapper);

          // Attach smooth-scroll + focus behavior to anchors we just created
          try {
            const anchors = appended.querySelectorAll('a[href^="#"]');
            anchors.forEach((a) => {
              a.addEventListener("click", (ev) => {
                ev.preventDefault();
                const id = (a.getAttribute("href") || "").slice(1);
                if (!id) return;
                // Find heading inside the rendered container. We will query container for the id.
                // Because we will append heading wrappers later in the loop, we can still find them by id
                // as long as they exist in doc and we render them with same id (we did).
                const target = container.querySelector(`#${CSS && CSS.escape ? CSS.escape(id) : id}`);
                if (target) {
                  try {
                    target.scrollIntoView({ behavior: "smooth", block: "center" });
                  } catch (err) {
                    // fallback
                    target.scrollIntoView();
                  }
                  // attempt to focus for accessibility
                  try {
                    if (!target.hasAttribute("tabindex")) {
                      target.setAttribute("tabindex", "-1");
                      target.addEventListener("blur", () => {
                        try { target.removeAttribute("tabindex"); } catch (e) {}
                      }, { once: true });
                    }
                    target.focus({ preventScroll: true });
                  } catch (e) {
                    // ignore focus errors
                  }
                } else {
                  // If heading node isn't present in the container yet (TOC before headings),
                  // try to find it in the doc and then attempt to find the rendered node after a tiny delay.
                  setTimeout(() => {
                    const delayed = container.querySelector(`#${CSS && CSS.escape ? CSS.escape(id) : id}`);
                    if (delayed) {
                      try { delayed.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { delayed.scrollIntoView(); }
                      try { delayed.focus({ preventScroll: true }); } catch (e) {}
                    }
                  }, 60);
                }
              });
            });
          } catch (err) {
            // Non-fatal; continue rendering other blocks
            console.error("Failed to attach TOC anchor listeners", err);
          }

          // Already appended and handled the anchor listeners — continue to next element
          return;
        } else {
          // Generic div
          wrapper.innerHTML = element.outerHTML;
        }
      } else {
        // Unknown element, keep as is
        wrapper.innerHTML = element.outerHTML;
      }

      container.appendChild(wrapper);
    });
    
    // Safety: also process Mermaid if some pre>code slipped through
    renderMermaidInContainer(container);
  }, [htmlContent]);

  return <div ref={containerRef} className="post-content" />;
}
