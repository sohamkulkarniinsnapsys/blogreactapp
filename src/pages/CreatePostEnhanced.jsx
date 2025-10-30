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
    const newBlock = {
      id: crypto.randomUUID(),
      type,
      content,
      ...(type === "code" && { language: "javascript" }),
    };
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

    // Don't handle special keys for code blocks
    if (block.type === "code") return;

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
          const imageBlock = { id: crypto.randomUUID(), type: "image", content: "", src: reader.result };
          const index = blocks.findIndex((b) => b.id === id);
          const updated = [...blocks];
          updated.splice(index + 1, 0, imageBlock);
          setBlocks(updated);
        };
        reader.readAsDataURL(file);
      };
      fileInput.click();
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
    // Validation: title + content (allow image-only blocks)
    if (
      !title.trim() ||
      blocks.every((b) => b.content.replace(/<[^>]*>?/gm, "").trim() === "" && b.type !== "image")
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
            case "image":
              // keep whatever src the block has (base64 or remote URL)
              return `<img src="${b.src}" alt="uploaded" />`;
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
            ):
            b.type === "separator" ? (
            <hr className="border-t border-gray-300 dark:border-gray-600 my-4" />
            ) : b.type === "image" ? (
              <div className="relative w-full mx-auto my-2">
                <img
                  src={b.src}
                  alt="uploaded"
                  className="rounded-lg max-h-96 object-cover shadow-md cursor-pointer"
                  onClick={() => {
                    // Open modal for editing
                    setEditingImage({ id: b.id, src: b.src });
                  }}
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
          if (lastBlock.type === "code" || lastBlock.type === "image" || lastBlock.type === "separator" || lastBlock.content.trim() !== "") {
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
        );
      }

{/** choose option b
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPost, getFileViewUrl } from "../services/appwrite";
import Spinner from "../components/Spinner";

export default function PostDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await getPost(id);
        setPost(p);
      } catch (err) {
        console.error("getPost error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
      <div
        className="prose dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.content }}
      ></div>
    </div>
  );
}
this is my react\blogreactapp\src\pages\PostDetails.jsx


import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPost } from "../services/appwrite";

export default function Post() {
  const { id } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    getPost(id).then(setPost);
  }, [id]);

  if (!post) return <p className="p-4">Loading post...</p>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div
        className="mt-4 prose dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.content }}
      ></div>
    </div>
  );
}
this is my react\blogreactapp\src\pages\Post.jsx

do changes as required and update the code and give whole code */}