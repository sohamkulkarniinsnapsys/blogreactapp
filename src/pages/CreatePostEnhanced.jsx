// src/pages/CreatePostEnhanced.jsx
import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPost, getCurrentUser } from "../services/appwrite";
import mermaid from "mermaid";
import Cropper from "react-easy-crop";


// Initialize mermaid
mermaid.initialize({ startOnLoad: false, theme: "default" });

const slashCommands = {
  H1: "H1",
  H2: "H2",
  H3: "H3",
  paragraph: "Text",
  code: "Code",
  image: "Image",
  table: "Table View",
  bulleted: "Bulleted List",
  numbered: "Numbered List",
  callout: "Callout",
  quote: "Quote",
  toc: "Table of Contents",
};

const codingLanguages = [
  "javascript",
  "python",
  "java",
  "cpp",
  "csharp",
  "go",
  "rust",
  "typescript",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "sql",
  "html",
  "css",
  "bash",
  "json",
  "yaml",
  "markdown",
  "mermaid",
  "plaintext",
];

export default function CreatePostEnhanced() {
  const navigate = useNavigate();

  const titleRef = useRef(null);
  const blockRefs = useRef({});
  const mermaidRefs = useRef({});
  const draggedItem = useRef(null);
  const draggedOverItem = useRef(null);

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([{ id: crypto.randomUUID(), type: "paragraph", content: "" }]);
  const [focusNextId, setFocusNextId] = useState(null);
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [isHoveringCover, setIsHoveringCover] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [slashMenuId, setSlashMenuId] = useState(null);
  const [mermaidPreviews, setMermaidPreviews] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState(null); // changed to store block id that was copied
  const lastEmptyListItem = useRef(null); // Track last empty list item for double-enter detection

  // image edit
  const [editingImage, setEditingImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
  setCroppedAreaPixels(croppedAreaPixels);
};

  // User state (fetch current user if needed)
  const [user, setUser] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch (err) {
        // not fatal here; we will show an error on submit if user missing
        console.warn("Could not fetch current user on mount:", err);
      }
    })();
  }, []);

  useEffect(() => titleRef.current?.focus(), []);

  useLayoutEffect(() => {
    if (focusNextId) {
      const el = blockRefs.current[focusNextId];
      if (el) {
        el.focus();
        if (el.contentEditable === "true") {
          placeCaretAtEnd(el);
        }
      }
      setFocusNextId(null);
    }
  }, [focusNextId, blocks]);

  // Render Mermaid diagrams
  useEffect(() => {
    blocks.forEach(async (block) => {
      if (block.type === "code" && block.language === "mermaid" && block.content) {
        try {
          const element = mermaidRefs.current[block.id];
          if (element) {
            element.innerHTML = "";
            const { svg } = await mermaid.render(`mermaid-${block.id}`, block.content);
            element.innerHTML = svg;
            setMermaidPreviews((prev) => ({ ...prev, [block.id]: null }));
          }
        } catch (error) {
          setMermaidPreviews((prev) => ({
            ...prev,
            [block.id]: `Error: ${error.message}`,
          }));
        }
      }
    });
  }, [blocks]);

  const placeCaretAtEnd = (el) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeCoverImage = () => setCoverImage(null);

  const addBlock = (index, type = "paragraph", content = "") => {
    const base = {
    id: crypto.randomUUID(),
    type,
    content,
    ...(type === "code" && { language: "javascript" }),
  };

  const newBlock =
    type === "table"
      ? {
          ...base,
          type: "table",
          rows: 3,
          cols: 3,
          data: Array(3).fill(null).map(() => Array(3).fill("")),
          hasHeader: true,
        }
      : type === "list"
      ? {
          ...base,
          type: "list",
          style: "unordered", // default; can be "ordered"
          items: [""] // one empty item by default
        }
      : base;

    const updated = [...blocks];
    updated.splice(index + 1, 0, newBlock);
    setBlocks(updated);
    setFocusNextId(newBlock.id);
  };

  const removeBlock = (index) => {
    if (blocks.length === 1) return;
    const updated = blocks.filter((_, i) => i !== index);
    const prev = updated[index - 1] || updated[0];
    setBlocks(updated);
    setFocusNextId(prev.id);
  };

  const removeBlockById = (id) => {
  setBlocks((prev) => {
      if (prev.length === 1) return prev; // prevent deleting last block
      const index = prev.findIndex((b) => b.id === id);
      const updated = prev.filter((b) => b.id !== id);
      const nextBlock = updated[index] || updated[index - 1];
      if (nextBlock) setFocusNextId(nextBlock.id);
      return updated;
    });
  };


  const handleBlockInput = (id, html) => {
  const text = html.replace(/<[^>]*>?/gm, "").trim(); // plain text

  // Show slash menu if starts with "/"
  if (text.startsWith("/")) {
    setSlashMenuId(id);
  } else if (slashMenuId === id) {
    setSlashMenuId(null);
  }

  setBlocks((prevBlocks) =>
    prevBlocks.map((b) => {
      if (b.id === id) {
        // ✅ New: convert '---' to separator block
        if (text === "---") {
          return { ...b, type: "separator", content: "" };
        }
        return { ...b, content: html };
      }
      return b;
    })
  );
};


  const handleCodeInput = (id, value) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: value } : b)));
  };

  const handleLanguageChange = (id, language) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, language } : b)));
  };

  // Update a specific cell's content
const handleTableCellChange = (blockId, rowIndex, colIndex, value) => {
  setBlocks((prev) =>
    prev.map((b) => {
      if (b.id === blockId && b.type === "table") {
        const newData = b.data.map((row, ri) =>
          row.map((cell, ci) => (ri === rowIndex && ci === colIndex ? value : cell))
        );
        return { ...b, data: newData };
      }
      return b;
    })
  );
};

// Add a new row at the bottom
const addTableRow = (blockId) => {
  setBlocks((prev) =>
    prev.map((b) => {
      if (b.id === blockId && b.type === "table") {
        const newRow = Array(b.cols).fill("");
        return {
          ...b,
          rows: b.rows + 1,
          data: [...b.data, newRow],
        };
      }
      return b;
    })
  );
};

// Add a new column on the right
const addTableColumn = (blockId) => {
  setBlocks((prev) =>
    prev.map((b) => {
      if (b.id === blockId && b.type === "table") {
        const newData = b.data.map((row) => [...row, ""]);
        return {
          ...b,
          cols: b.cols + 1,
          data: newData,
        };
      }
      return b;
    })
  );
};

// Delete a specific row (keep at least 1 row)
const deleteTableRow = (blockId, rowIndex) => {
  setBlocks((prev) =>
    prev.map((b) => {
      if (b.id === blockId && b.type === "table" && b.rows > 1) {
        const newData = b.data.filter((_, i) => i !== rowIndex);
        return {
          ...b,
          rows: b.rows - 1,
          data: newData,
        };
      }
      return b;
    })
  );
};

// Delete a specific column (keep at least 1 column)
const deleteTableColumn = (blockId, colIndex) => {
  setBlocks((prev) =>
    prev.map((b) => {
      if (b.id === blockId && b.type === "table" && b.cols > 1) {
        const newData = b.data.map((row) => row.filter((_, i) => i !== colIndex));
        return {
          ...b,
          cols: b.cols - 1,
          data: newData,
        };
      }
      return b;
    })
  );
};

// Toggle header row styling
const toggleTableHeader = (blockId) => {
  setBlocks((prev) =>
    prev.map((b) => {
      if (b.id === blockId && b.type === "table") {
        return { ...b, hasHeader: !b.hasHeader };
      }
      return b;
    })
  );
};

  // Copy handler that accepts block id
  const handleCopy = async (blockId) => {
    try {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      let textToCopy = "";

      if (block.type === "code") {
        // For code blocks, copy raw code from state
        textToCopy = block.content || "";
      } else if (block.type === "image") {
        // For image blocks, copy the image src (you can change to copy markdown img or nothing)
        textToCopy = block.src || "";
      } else if (block.type === "table") {
      // Copy table as TSV (Tab-Separated Values)
      textToCopy = block.data.map(row => row.join("\t")).join("\n");
    } else {
        // For contentEditable blocks, prefer what's actually visible in the DOM
        const el = blockRefs.current[blockId];
        if (el) {
          // use innerText to get only visible text (no HTML)
          textToCopy = (el.innerText || "").trim();
        }
        // fallback to stored content (stripped) if DOM missing
        if (!textToCopy) {
          textToCopy = (block.content || "").replace(/<[^>]*>?/gm, "").trim();
        }
      }

      if (!textToCopy) {
        // nothing to copy
        return;
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(blockId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleKeyDown = (e, index) => {
    const block = blocks[index];

    // Special handling for lists (double Enter to exit)
    if (block.type === "bulleted" || block.type === "numbered") {
      if (e.key === "Enter") {
        // Get the current list element
        const listEl = blockRefs.current[block.id];
        if (!listEl) return;

        // Check if we're in an empty list item
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const currentNode = range.startContainer;
          
          // Find the parent <li> element
          let liElement = currentNode.nodeType === Node.TEXT_NODE ? currentNode.parentElement : currentNode;
          while (liElement && liElement.tagName !== 'LI' && liElement !== listEl) {
            liElement = liElement.parentElement;
          }

          // Check if this <li> is empty or only has whitespace
          if (liElement && liElement.tagName === 'LI') {
            const liText = liElement.textContent.trim();
            
            if (liText === '') {
              // Empty list item - check if this is the second Enter press
              if (lastEmptyListItem.current === block.id) {
                // Second Enter on empty item - exit list and create paragraph
                e.preventDefault();
                
                // Remove the empty <li>
                liElement.remove();
                
                // Update block content
                setBlocks((prev) =>
                  prev.map((b) => (b.id === block.id ? { ...b, content: listEl.innerHTML } : b))
                );
                
                // Create new paragraph block after this list
                addBlock(index, "paragraph");
                
                // Reset tracker
                lastEmptyListItem.current = null;
                return;
              } else {
                // First Enter on empty item - track it
                lastEmptyListItem.current = block.id;
              }
            } else {
              // Non-empty item - reset tracker
              lastEmptyListItem.current = null;
            }
          }
        }
      } else {
        // Any other key - reset tracker
        lastEmptyListItem.current = null;
      }
      return; // Let browser handle list editing
    }

    // Don't handle special keys for code blocks and tables
    if (block.type === "code" || block.type === "table") return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        document.execCommand("insertLineBreak");
        return;
      }
      addBlock(index, "paragraph");
      return;
    }
    if (e.key === "Backspace" && block.content.replace(/<[^>]*>?/gm, "") === "") {
      e.preventDefault();
      removeBlock(index);
      return;
    }
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      const prev = blocks[index - 1];
      blockRefs.current[prev.id]?.focus();
      if (prev.type !== "code") {
        placeCaretAtEnd(blockRefs.current[prev.id]);
      }
    } else if (e.key === "ArrowDown" && index < blocks.length - 1) {
      e.preventDefault();
      const next = blocks[index + 1];
      blockRefs.current[next.id]?.focus();
      if (next.type !== "code") {
        placeCaretAtEnd(blockRefs.current[next.id]);
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index) => {
    draggedItem.current = index;
    setIsDragging(true);
  };

  const handleDragEnter = (index) => {
    draggedOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (draggedItem.current !== null && draggedOverItem.current !== null) {
      const updated = [...blocks];
      const draggedItemContent = updated[draggedItem.current];
      updated.splice(draggedItem.current, 1);
      updated.splice(draggedOverItem.current, 0, draggedItemContent);
      setBlocks(updated);
    }
    draggedItem.current = null;
    draggedOverItem.current = null;
    setIsDragging(false);
  };

  const applyFormat = (id, type) => {
    const el = blockRefs.current[id];
    if (!el) return;

    let text = el.textContent.replace(/^\/\w*/, "").trim();
    el.innerHTML = text;

        if (type === "Image") {
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = "image/*";
          fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onloadend = () => {
          const dataUrl = reader.result;

          // Ask the user whether to set as cover or insert inline.
          // OK => Set as cover. Cancel => Insert inline image block.
          
            // Insert as an inline image block (existing behavior)
            const imageBlock = {
              id: crypto.randomUUID(),
              type: "image",
              src: dataUrl,
              caption: "", // added for captions
            };
            const index = blocks.findIndex((b) => b.id === id);
            const updated = [...blocks];
            updated.splice(index + 1, 0, imageBlock);
            setBlocks(updated);
            setFocusNextId(imageBlock.id);
          
         };
          reader.readAsDataURL(file);
          };
          fileInput.click();
          setSlashMenuId(null);
          return;
        }

        // Create callout block
        if (type === "Callout") {
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === id
                ? {
                    ...b,
                    type: "callout",
                    content: text,
                    icon: "💡", // default icon
                    bgColor: "blue", // default color
                  }
                : b
            )
          );
          setFocusNextId(id);
          setSlashMenuId(null);
          return;
        }

        // Create quote block
        if (type === "Quote") {
          setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, type: "quote", content: text } : b))
          );
          setFocusNextId(id);
          setSlashMenuId(null);
          return;
        }

        // Create table of contents block
        if (type === "Table of Contents") {
          setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, type: "toc", content: "" } : b))
          );
          setFocusNextId(id);
          setSlashMenuId(null);
          return;
        }

        // Create list block
        if (type === "Bulleted List" || type === "Numbered List") {
          const lines = text.length
            ? text.split(/\n+/).map((t) => t.trim()).filter(Boolean)
            : [""];
          const listTag = type === "Bulleted List" ? "ul" : "ol";
          const html = `<${listTag}>${lines.map((l) => `<li>${l}</li>`).join("")}</${listTag}>`;
          el.innerHTML = html;
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === id
                ? { ...b, type: type === "Bulleted List" ? "bulleted" : "numbered", content: html }
                : b
            )
          );
          setFocusNextId(id);
          setSlashMenuId(null);
          return;
        }

        if (type === "Table View") {
          const index = blocks.findIndex((b) => b.id === id);
          const tableBlock = {
            id: crypto.randomUUID(),
            type: "table",
            rows: 3,
            cols: 3,
            data: Array(3).fill(null).map(() => Array(3).fill("")),
            hasHeader: true,
          };
          const updated = [...blocks];
          updated.splice(index + 1, 0, tableBlock);
          setBlocks(updated);
          setFocusNextId(tableBlock.id);
          setSlashMenuId(null);
          return;
        }

    if (type === "Code") {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, type: "code", content: text, language: "javascript" } : b))
      );
    } else {
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type, content: text } : b)));
    }

    setFocusNextId(id);
    setSlashMenuId(null);
  };

  // Helper: convert dataURL (base64) to File
  const dataURLtoFile = (dataurl, filename = "file.png") => {
    if (!dataurl) return null;
    const arr = dataurl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    try {
      return new File([u8arr], filename, { type: mime });
    } catch (err) {
      // Some older environments may not accept File constructor — fallback to Blob
      const blob = new Blob([u8arr], { type: mime });
      blob.name = filename;
      return blob;
    }
  };

  // ---------- UPDATED handleSubmit ----------
  const handleSubmit = async () => {
    // Validation: title + content (allow image-only blocks and blocks without content property)
    if (
      !title.trim() ||
      blocks.every((b) => {
        // Some blocks don't have content property (image, table, toc)
        if (b.type === "image" || b.type === "table" || b.type === "toc") return false;
        // For blocks with content, check if it's empty
        return !b.content || b.content.replace(/<[^>]*>?/gm, "").trim() === "";
      })
    ) {
      setError("Title and content required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Ensure we have a logged-in user (try fetching again if missing)
      let currentUser = user;
      if (!currentUser) {
        try {
          currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (uErr) {
          throw new Error("User not loaded. Please log in again.");
        }
      }

      // Convert blocks -> HTML
      // NOTE: inline images (b.type === "image") keep their `src` values (likely data URLs).
      // If you want to upload inline images to Appwrite storage instead (to avoid big HTML strings),
      // we can add that upload step in a follow-up.
      const contentHtml = blocks
        .map((b) => {
          switch (b.type) {
            case "paragraph":
              return `<p>${b.content}</p>`;
            case "H1":
              return `<h1>${b.content}</h1>`;
            case "H2":
              return `<h2>${b.content}</h2>`;
            case "H3":
              return `<h3>${b.content}</h3>`;
            case "code":
              return `<pre><code class="language-${b.language}">${b.content}</code></pre>`;
            case "table":
              const tableHtml = `
                <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
                  ${b.data.map((row, ri) => `
                    <tr>
                      ${row.map((cell, ci) => {
                        const isHeader = b.hasHeader && ri === 0;
                        const tag = isHeader ? "th" : "td";
                        return `<${tag} style="border: 1px solid #ddd; padding: 8px; text-align: left; ${isHeader ? 'background-color: #f5f5f5; font-weight: bold;' : ''}">${cell || ''}</${tag}>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </table>
              `;
              return tableHtml;
            case "image":
              // keep whatever src the block has (base64 or remote URL)
              return `
              <figure style="text-align:center;">
                <img src="${b.src}" alt="uploaded" style="max-width:100%; border-radius:8px; align-items: center" />
                ${b.caption ? `<figcaption style="font-size:0.9em; color:gray; margin-top:4px; text-align:center;">${b.caption}</figcaption>` : ""}
              </figure>
            `;
            case "bulleted":
            case "numbered":
              // Lists already have proper HTML in content
              return b.content;
            case "callout":
              const calloutBgColor =
                b.bgColor === "blue"
                  ? "#eff6ff"
                  : b.bgColor === "yellow"
                  ? "#fefce8"
                  : b.bgColor === "red"
                  ? "#fef2f2"
                  : b.bgColor === "green"
                  ? "#f0fdf4"
                  : "#f9fafb";
              const calloutBorderColor =
                b.bgColor === "blue"
                  ? "#3b82f6"
                  : b.bgColor === "yellow"
                  ? "#eab308"
                  : b.bgColor === "red"
                  ? "#ef4444"
                  : b.bgColor === "green"
                  ? "#22c55e"
                  : "#6b7280";
              return `
                <div style="display: flex; gap: 12px; padding: 16px; border-radius: 8px; border-left: 4px solid ${calloutBorderColor}; background-color: ${calloutBgColor}; margin: 12px 0;">
                  <span style="font-size: 1.5em;">${b.icon || "💡"}</span>
                  <div style="flex: 1;">${b.content}</div>
                </div>
              `;
            case "quote":
              return `
                <blockquote style="border-left: 4px solid #9ca3af; padding-left: 16px; padding-top: 8px; padding-bottom: 8px; margin: 12px 0; font-size: 1.125rem; font-style: italic; color: #4b5563;">
                  ${b.content}
                </blockquote>
              `;
            case "toc":
              // Generate TOC HTML from headings
              const tocItems = blocks
                .filter((block) => block.type === "H1" || block.type === "H2" || block.type === "H3")
                .map((heading) => {
                  const level = heading.type === "H1" ? 0 : heading.type === "H2" ? 1 : 2;
                  const text = heading.content.replace(/<[^>]*>?/gm, "").trim();
                  const marginLeft = level === 0 ? "0" : level === 1 ? "16px" : "32px";
                  const fontWeight = level === 0 ? "bold" : "normal";
                  return `<div style="margin-left: ${marginLeft}; font-weight: ${fontWeight}; margin-bottom: 8px;">${text}</div>`;
                })
                .join("");
              return `
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0;">
                  <div style="font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span>📑</span>
                    <span>Table of Contents</span>
                  </div>
                  <div>${tocItems || '<div style="color: #9ca3af; font-style: italic;">No headings found</div>'}</div>
                </div>
              `;
            default:
              return b.content;
          }
        })
        .join("");

      // Prepare cover image as File if it exists and is a data URL
      let coverFile = null;
      if (coverImage) {
        // If coverImage is a File already (rare), pass it through; otherwise convert data URL -> File
        if (typeof coverImage === "string" && coverImage.startsWith("data:")) {
          coverFile = dataURLtoFile(coverImage, "cover.png");
        } else if (coverImage instanceof File || coverImage instanceof Blob) {
          coverFile = coverImage;
        } else {
          // fallback: ignore cover
          coverFile = null;
        }
      }

      // Call createPost (same signature as your TinyMCE version)
      // createPost(title, contentHtml, coverFile, authorId, status)
      const newPost = await createPost(title, contentHtml, coverFile, currentUser.$id || currentUser.id, status);

      // If createPost returns successfully, navigate to the newly created post
      const createdId = newPost?.$id || newPost?.id || newPost?.postId || null;
      if (createdId) {
        navigate(`/post/${createdId}`);
      } else {
        // If createPost succeeded but didn't return id, just log and go home
        console.warn("createPost returned but did not include id:", newPost);
        navigate("/");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  // utils to get the cropped image from cropper
const getCroppedImg = (imageSrc, crop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        // Correct: pass blob object to URL.createObjectURL
        const fileUrl = window.URL.createObjectURL(blob);
        resolve(fileUrl);
      }, "image/jpeg");
    };
    image.onerror = (err) => reject(err);
  });
};

const saveCroppedImage = async () => {
  try {
    if (!croppedAreaPixels || !editingImage) return;

    const croppedImageUrl = await getCroppedImg(editingImage.src, croppedAreaPixels);

    // Update the image block in your blocks state
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === editingImage.id ? { ...b, src: croppedImageUrl } : b
      )
    );

    setEditingImage(null);
  } catch (error) {
    console.error("Failed to crop image:", error);
  }
};

  // ---------- end handleSubmit ----------

  return (
    <>
      <style>{`
        [contenteditable] ul,
        [contenteditable] ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          list-style-position: inside;
        }
        [contenteditable] ul li,
        [contenteditable] ol li {
          margin: 0.25rem 0;
          padding-left: 0.25rem;
        }
        [contenteditable] ul {
          list-style-type: disc;
        }
        [contenteditable] ol {
          list-style-type: decimal;
        }
        /* Ensure list items display properly */
        [contenteditable] ul li::marker,
        [contenteditable] ol li::marker {
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
          text-transform: none;
        }
      `}</style>
      <div className="max-w-4xl mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg min-h-screen">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">📝 Create Post (Notion Style)</h2>
        {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      {/* Cover Image */}
      <div
        className="relative mb-4"
        onMouseEnter={() => setIsHoveringCover(true)}
        onMouseLeave={() => setIsHoveringCover(false)}
      >
        {coverImage ? (
          <div className="relative">
            <img src={coverImage} alt="Cover" className="w-full h-64 object-cover rounded-xl shadow-md" />
            {isHoveringCover && (
              <div className="absolute top-3 right-3 flex gap-2 z-10">
                <label className="cursor-pointer bg-black/60 text-white px-3 py-1 rounded-lg text-sm hover:bg-black transition">
                  Change Cover
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={removeCoverImage}
                  className="cursor-pointer bg-black/60 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          isHoveringCover && (
            <div className="flex justify-center py-8">
              <label className="cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white px-6 py-3 rounded-lg shadow text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                🖼️ Add Cover Image
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
            </div>
          )
        )}
      </div>

            {/* Title */}
      <div
        className="relative group mb-8"
        onMouseEnter={() => setIsHoveringTitle(true)}
        onMouseLeave={() => setIsHoveringTitle(false)}
      >
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const firstBlock = blockRefs.current[blocks[0].id];
              if (firstBlock) {
                firstBlock.focus();
                if (blocks[0].type !== "code") {
                  placeCaretAtEnd(firstBlock);
                }
              }
            }
          }}
          placeholder="Untitled"
          className="w-full text-5xl font-bold p-3 bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
        />

        {/* Add Cover Image button (right side, shows on hover like Notion) */}
        <div className="absolute right-3 top-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
          <label
            title="Add cover image"
            className="cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4" />
            </svg>
            Add Cover
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* If there's already a cover, show small 'Change / Remove' controls (optional) */}
        {coverImage && (
          <div className="absolute right-3 top-12 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
            <div className="flex gap-2">
              <label
                title="Change cover"
                className="cursor-pointer bg-black text-white px-3 py-1 rounded-lg text-sm hover:bg-black/20 transition"
              >
                Change
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
              <button
                onClick={removeCoverImage}
                className="cursor-pointer bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Blocks */}
      <div className="space-y-2">
        {blocks.map((b, index) => (
          <div
            key={b.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`relative group ${isDragging && draggedItem.current === index ? "opacity-50" : ""}`}
          >
            {/* Drag Handle */}
            <div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>

            {/* Code Block */}
            {b.type === "code" ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Code Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <select
                    value={b.language}
                    onChange={(e) => handleLanguageChange(b.id, e.target.value)}
                    className="text-sm bg-transparent border-none focus:outline-none cursor-pointer text-black dark:text-black font-mono"
                  >
                    {codingLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleCopy(b.id)}
                    className={`cursor-pointer px-3 py-1 rounded-md text-sm transition ${
                      copiedId === b.id ? "bg-transparent text-white" : "bg-transparent hover:text-gray-300"
                    }`}
                  >
                    {copiedId === b.id ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Code Input */}
                <textarea
                  ref={(el) => (blockRefs.current[b.id] = el)}
                  value={b.content}
                  onChange={(e) => handleCodeInput(b.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.target.selectionStart;
                      const end = e.target.selectionEnd;
                      const newValue = b.content.substring(0, start) + "  " + b.content.substring(end);
                      handleCodeInput(b.id, newValue);
                      setTimeout(() => {
                        e.target.selectionStart = e.target.selectionEnd = start + 2;
                      }, 0);
                    }
                    if (e.key === "Backspace" && b.content === "") {
                      e.preventDefault();
                      removeBlock(index);
                    }
                  }}
                  placeholder={`Write ${b.language} code...`}
                  className="w-full p-4 bg-transparent focus:outline-none font-mono text-sm text-gray-800 dark:text-gray-200 resize-none min-h-[120px]"
                  spellCheck="false"
                />

                {/* Mermaid Preview */}
                {b.language === "mermaid" && b.content && (
                  <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">Preview:</div>
                    {mermaidPreviews[b.id] ? (
                      <div className="text-red-500 text-sm">{mermaidPreviews[b.id]}</div>
                    ) : (
                      <div ref={(el) => (mermaidRefs.current[b.id] = el)} className="flex justify-center items-center overflow-x-auto" />
                    )}
                  </div>
                )}
              </div>
            ): b.type === "separator" ? (
            <hr className="border-t border-gray-300 dark:border-gray-600 my-4" />
            ) : b.type === "table" ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 relative">
                {/* Top Controls */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  {/* Left Controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addTableRow(b.id)}
                      className="cursor-pointer text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      title="Add Row"
                    >
                      + Row
                    </button>
                    <button
                      onClick={() => addTableColumn(b.id)}
                      className="cursor-pointer text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      title="Add Column"
                    >
                      + Col
                    </button>
                    <button
                      onClick={() => toggleTableHeader(b.id)}
                      className={`cursor-pointer text-xs px-2 py-1 rounded ${
                        b.hasHeader
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300"
                      }`}
                      title="Toggle Header Row"
                    >
                      Header
                    </button>
                  </div>

                  {/* Right Controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(b.id)}
                      className={`cursor-pointer text-xs px-2 py-1 rounded transition ${
                        copiedId === b.id
                          ? "bg-transparent text-green-600"
                          : "bg-transparent hover:text-gray-300"
                      }`}
                    >
                      {copiedId === b.id ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => removeBlockById(b.id)}
                      className="cursor-pointer text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                    >
                      Delete Table
                    </button>
                  </div>
                </div>

                {/* Table Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      {b.data.map((row, ri) => (
                        <tr key={ri} className="group/row">
                          {row.map((cell, ci) => {
                            const isHeader = b.hasHeader && ri === 0;
                            return (
                              <td
                                key={ci}
                                className={`border border-gray-200 dark:border-gray-600 p-0 relative ${
                                  isHeader ? "bg-gray-50 dark:bg-gray-700" : ""
                                }`}
                              >
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) =>
                                    handleTableCellChange(b.id, ri, ci, e.target.value)
                                  }
                                  className={`w-full px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 ${
                                    isHeader ? "font-semibold" : ""
                                  }`}
                                  placeholder={isHeader ? "Header" : "Cell"}
                                />
                                
                                {/* Delete column button (shows on hover) */}
                                {ri === 0 && b.cols > 1 && (
                                  <button
                                    onClick={() => deleteTableColumn(b.id, ci)}
                                    className="cursor-pointer absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/row:opacity-100 bg-red-500 text-white text-xs px-2 py-0.5 rounded hover:bg-red-600 transition"
                                    title="Delete Column"
                                  >
                                    ×
                                  </button>
                                )}
                              </td>
                            );
                          })}
                          
                          {/* Delete row button (shows on hover) */}
                          {b.rows > 1 && (
                            <td className="border-0 pl-2">
                              <button
                                onClick={() => deleteTableRow(b.id, ri)}
                                className="cursor-pointer opacity-0 group-hover/row:opacity-100 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition"
                                title="Delete Row"
                              >
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : b.type === "bulleted" || b.type === "numbered" ? (
              <div className="relative w-full min-h-8">
                <div
                  ref={(el) => {
                    if (el) {
                      blockRefs.current[b.id] = el;
                      // Only set innerHTML if it's actually different (avoid cursor reset)
                      const currentHTML = el.innerHTML;
                      const newHTML = b.content || "";
                      if (currentHTML !== newHTML && document.activeElement !== el) {
                        el.innerHTML = newHTML;
                      }
                    }
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleBlockInput(b.id, e.currentTarget.innerHTML)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-full p-2 pl-6 bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 text-base list-inside"
                  style={{
                    listStyleType: b.type === "bulleted" ? "disc" : "decimal",
                  }}
                />
                {(!b.content || b.content.replace(/<[^>]*>?/gm, "").trim() === "") && (
                  <span className="absolute top-2 left-6 text-gray-400 dark:text-gray-500 pointer-events-none select-none text-base">
                    Type '/' for commands
                  </span>
                )}
              </div>
            ) : b.type === "callout" ? (
              <div className="relative w-full min-h-16 my-3">
                <div
                  className={`flex gap-3 p-4 rounded-lg border-l-4 ${
                    b.bgColor === "blue"
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                      : b.bgColor === "yellow"
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500"
                      : b.bgColor === "red"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                      : b.bgColor === "green"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-500"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-500"
                  }`}
                >
                  {/* Icon selector */}
                  <div className="relative shrink-0">
                    <input
                      type="text"
                      value={b.icon || "💡"}
                      onChange={(e) => {
                        const newIcon = e.target.value;
                        setBlocks((prev) =>
                          prev.map((block) =>
                            block.id === b.id ? { ...block, icon: newIcon } : block
                          )
                        );
                      }}
                      onFocus={(e) => {
                        // Try to open emoji picker on Windows (Win + .)
                        e.target.select();
                      }}
                      className="cursor-pointer text-2xl hover:scale-110 transition w-10 h-10 text-center bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      title="Click and press Win + . for emoji picker"
                      maxLength="2"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 relative">
                    <div
                      ref={(el) => {
                        if (el) {
                          blockRefs.current[b.id] = el;
                          // Only update if not focused to preserve cursor
                          if (document.activeElement !== el && el.textContent !== b.content) {
                            el.textContent = b.content;
                          }
                        }
                      }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => handleBlockInput(b.id, e.currentTarget.textContent)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-full bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 text-base min-h-6"
                    />
                    {(!b.content || b.content.trim() === "") && (
                      <span className="absolute top-0 left-0 text-gray-400 dark:text-gray-500 pointer-events-none select-none text-base">
                        Type something...
                      </span>
                    )}
                  </div>

                  {/* Color selector */}
                  <select
                    value={b.bgColor || "blue"}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((block) =>
                          block.id === b.id ? { ...block, bgColor: e.target.value } : block
                        )
                      )
                    }
                    className="cursor-pointer text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none shrink-0 h-8"
                  >
                    <option value="blue" className="bg-white dark:bg-gray-700">Blue</option>
                    <option value="yellow" className="bg-white dark:bg-gray-700">Yellow</option>
                    <option value="red" className="bg-white dark:bg-gray-700">Red</option>
                    <option value="green" className="bg-white dark:bg-gray-700">Green</option>
                    <option value="gray" className="bg-white dark:bg-gray-700">Gray</option>
                  </select>
                </div>
              </div>
            ) : b.type === "quote" ? (
              <div className="relative w-full min-h-8 my-3">
                <div className="border-l-4 border-gray-400 dark:border-gray-600 pl-4 py-2 relative">
                  <div
                    ref={(el) => {
                      if (el) {
                        blockRefs.current[b.id] = el;
                        // Only update if not focused to preserve cursor
                        if (document.activeElement !== el && el.textContent !== b.content) {
                          el.textContent = b.content;
                        }
                      }
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => handleBlockInput(b.id, e.currentTarget.textContent)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-full bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 text-lg italic min-h-7"
                  />
                  {(!b.content || b.content.trim() === "") && (
                    <span className="absolute top-2 left-4 text-gray-400 dark:text-gray-500 pointer-events-none select-none text-lg italic">
                      Type a quote...
                    </span>
                  )}
                </div>
              </div>
            ) : b.type === "toc" ? (
              <div className="relative w-full min-h-16 my-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Table of Contents</span>
                  </div>
                  <div className="space-y-2">
                    {blocks
                      .filter((block) => block.type === "H1" || block.type === "H2" || block.type === "H3")
                      .map((heading, idx) => {
                        const level = heading.type === "H1" ? 0 : heading.type === "H2" ? 1 : 2;
                        const text = heading.content.replace(/<[^>]*>?/gm, "").trim();
                        return (
                          <div
                            key={idx}
                            className={`cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition ${
                              level === 0 ? "ml-0 font-semibold" : level === 1 ? "ml-4" : "ml-8"
                            }`}
                            onClick={() => {
                              const el = blockRefs.current[heading.id];
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                                el.focus();
                              }
                            }}
                          >
                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                              {text || "(Empty heading)"}
                            </span>
                          </div>
                        );
                      })}
                    {blocks.filter((block) => block.type === "H1" || block.type === "H2" || block.type === "H3").length === 0 && (
                      <div className="text-gray-400 dark:text-gray-500 text-sm italic">
                        No headings found. Add H1, H2, or H3 blocks to see them here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : b.type === "image" ? (
              <div className="relative w-full mx-auto my-2">
                <img
                  src={b.src}
                  alt="uploaded"
                  className="rounded-lg max-h-96 object-cover shadow-md cursor-pointer"
                  onClick={() => setEditingImage({ id: b.id, src: b.src })}
                />
                {/* Optional overlay buttons */}
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    onClick={() => setEditingImage({ id: b.id, src: b.src })}
                    className="cursor-pointer scale-130 bg-gray-800 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-700 "
                  >
                    Edit
                  </button>
                </div>

                {/* ✅ Caption input below image */}
                <input
                  type="text"
                  value={b.caption || ""}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((block) =>
                        block.id === b.id ? { ...block, caption: e.target.value } : block
                      )
                    )
                  }
                  placeholder="Add a caption..."
                  className="mt-2 w-full text-sm text-gray-500 dark:text-gray-400 bg-transparent focus:outline-none border-b border-transparent focus:border-gray-300 pb-1 text-align: text-center"
            />
              </div>
            ) : (
              <div className="relative w-full min-h-8">
                <div
                  ref={(el) => (blockRefs.current[b.id] = el)}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleBlockInput(b.id, e.currentTarget.innerHTML)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`w-full p-2 bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 ${
                    b.type === "H1"
                      ? "text-4xl font-bold"
                      : b.type === "H2"
                      ? "text-3xl font-semibold"
                      : b.type === "H3"
                      ? "text-2xl font-medium"
                      : "text-base"
                  }`}
                />
                {b.content.replace(/<[^>]*>?/gm, "") === "" && (
                  <span className="absolute top-2 left-2 text-gray-400 dark:text-gray-500 pointer-events-none select-none text-base">
                    Type '/' for commands
                  </span>
                )}
              </div>
            )}

            {editingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg w-11/12 max-w-5xl h-[80vh] relative flex flex-col">
                    {/* Close button */}
                    <button
                      className="cursor-pointer absolute top-4 right-4 text-gray-700 dark:text-gray-200 font-bold text-2xl z-50"
                      onClick={() => setEditingImage(null)}
                    >
                      ×
                    </button>

                    {/* Cropper */}
                    <div className="flex-1 relative">
                      <Cropper
                        image={editingImage.src}
                        crop={crop}
                        zoom={zoom}
                        aspect={4 / 3} // You can make this dynamic if needed
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        objectFit="contain"
                      />
                    </div>

                    {/* Controls */}
                    <div className="mt-4 flex justify-between items-center">
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="cursor-pointer w-full mr-4"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={saveCroppedImage}
                          className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingImage(null)}
                          className="cursor-pointer bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Slash menu */}
            {slashMenuId === b.id && (
              <div className="absolute top-full left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl mt-1 z-20 py-1 min-w-[200px]">
                {Object.entries(slashCommands).map(([cmd, type]) => (
                  <div
                    key={cmd}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormat(b.id, type);
                    }}
                  >
                    <span className="font-mono text-xs text-gray-500">/{cmd}</span>
                    <span>→</span>
                    <span className="font-medium">{type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

  {/* Footer */}
  <div
    className="flex justify-between items-center mt-15 pt-6 border-t border-gray-200 dark:border-gray-700 cursor-text"
    onClick={() => {
      const lastBlock = blocks[blocks.length - 1];
      // If last block is empty paragraph, just focus it
      if (lastBlock.type === "paragraph" && lastBlock.content.trim() === "") {
        setFocusNextId(lastBlock.id);
        return;
      }

      // If last block is code or image, create a new paragraph block
      if (lastBlock.type === "code" || lastBlock.type === "image" || lastBlock.type === "separator" || lastBlock.type === "table" || lastBlock.type === "callout" || lastBlock.type === "quote" || lastBlock.type === "toc" || lastBlock.content.trim() !== "") {
        addBlock(blocks.length - 1, "paragraph", "");
      }
    }}
  >
    <select
      value={status}
      onChange={(e) => setStatus(e.target.value)}
      className="cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="draft">💾 Draft</option>
      <option value="publish">🚀 Publish</option>
      <option value="archive">📦 Archive</option>
    </select>
    <button
      type="button"
      onClick={handleSubmit}
      disabled={loading}
      className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition font-medium shadow-sm"
    >
      {loading ? "Publishing..." : "Publish Post"}
    </button>
  </div>

      </div>
    </>
  );
}
