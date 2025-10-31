// src/services/appwrite.js
import {
  Client,
  Account,
  Databases,
  ID,
  Storage,
  Query,
  Permission,
  Role,
} from "appwrite";

// -----------------
// Appwrite Setup
// -----------------
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT?.trim().replace(/\/$/, "") || "";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID?.trim() || "";

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
export const PROJECT_ID = projectId;

// -----------------
// Environment Validation
// -----------------
if (!endpoint) console.error("[Appwrite] Missing: VITE_APPWRITE_ENDPOINT");
if (!DATABASE_ID || !COLLECTION_ID)
  console.warn("[Appwrite] Missing DATABASE_ID or COLLECTION_ID. CRUD may fail.");
if (!BUCKET_ID)
  console.warn("[Appwrite] Missing BUCKET_ID. Image uploads will fail.");

// -----------------
// Auth
// -----------------
export const signup = async (email, password, name) => {
  try {
    return await account.create(ID.unique(), email, password, name);
  } catch (err) {
    console.error("signup error:", err);
    throw err;
  }
};

export const login = async (email, password) => {
  try {
    if (typeof account.createEmailPasswordSession === "function") {
      await account.createEmailPasswordSession(email, password);
    } else if (typeof account.createEmailSession === "function") {
      await account.createEmailSession(email, password);
    } else {
      throw new Error("No available Appwrite session creation method.");
    }
    return await account.get();
  } catch (err) {
    console.error("login error:", err);
    throw err;
  }
};

export const logout = async () => {
  try {
    return await account.deleteSession("current");
  } catch (err) {
    console.error("logout error:", err);
    throw err;
  }
};

export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch {
    return null;
  }
};

// -----------------
// Storage
// -----------------
export const uploadImage = async (file, userId = null) => {
  if (!BUCKET_ID) throw new Error("BUCKET_ID is not configured.");

  try {
    const permissions = [Permission.read(Role.any())];
    if (userId) {
      permissions.push(
        Permission.write(Role.user(userId)),
        Permission.delete(Role.user(userId))
      );
    }

    const res = await storage.createFile(BUCKET_ID, ID.unique(), file, permissions);
    return res.$id;
  } catch (err) {
    console.error("uploadImage error:", err);
    throw err;
  }
};

export const uploadTextAsFile = async (text, filename = "content.json", userId = null) => {
  const blob = new Blob([text], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });
  return await uploadImage(file, userId);
};

export const getFileViewUrl = (fileId) => {
  if (!fileId || !BUCKET_ID || !PROJECT_ID || !endpoint) return null;
  return `${endpoint}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
};

// -----------------
// CRUD Helpers
// -----------------
function ensureDbConfig() {
  if (!DATABASE_ID) throw new Error("DATABASE_ID is not configured.");
  if (!COLLECTION_ID) throw new Error("COLLECTION_ID is not configured.");
}

// -----------------
// Create Post
// -----------------
export const createPost = async (title, content, imageFile, userId, status = "draft") => {
  ensureDbConfig();
  if (!userId) throw new Error("userId is required for post creation.");

  try {
    let fileId = null;
    if (imageFile) {
      fileId = await uploadImage(imageFile, userId);
    }

    // If content exceeds safe limit, upload as JSON file
    let finalContent = content;
    if (content && content.length > 65000) {
      console.warn("[Appwrite] Content too large, uploading as file instead.");
      const contentFileId = await uploadTextAsFile(content, "content.json", userId);
      finalContent = `__STORAGE_FILE__${contentFileId}`;
    }

    const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
      title: title || "",
      content: String(finalContent || ""),
      image: fileId || null,
      userID: userId,
      status,
    });
    return doc;
  } catch (err) {
    console.error("createPost error:", err);
    throw err;
  }
};

// -----------------
// Get Posts
// -----------------
export const getPosts = async ({ status = null, userId = null } = {}) => {
  ensureDbConfig();
  try {
    const queries = [];
    if (status) queries.push(Query.equal("status", status));
    if (userId) queries.push(Query.equal("userID", userId));

    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
    return res.documents || [];
  } catch (err) {
    console.error("getPosts error:", err);
    throw err;
  }
};

// -----------------
// Get Single Post
// -----------------
export const getPost = async (id) => {
  ensureDbConfig();
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, id);

    // If stored as file reference, fetch its content
    if (doc.content?.startsWith("__STORAGE_FILE__")) {
      const fileId = doc.content.replace("__STORAGE_FILE__", "");
      const fileUrl = getFileViewUrl(fileId);
      const response = await fetch(fileUrl);
      doc.content = await response.text();
    }

    return doc;
  } catch (err) {
    console.error("getPost error:", err);
    throw err;
  }
};

// -----------------
// Update Post
// -----------------
export const updatePost = async (id, title, content, imageFile, status) => {
  ensureDbConfig();
  try {
    const payload = { title, content: String(content || "") };

    if (imageFile) payload.image = await uploadImage(imageFile);
    if (status) payload.status = status;

    return await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, payload);
  } catch (err) {
    console.error("updatePost error:", err);
    throw err;
  }
};

// -----------------
// Delete Post
// -----------------
export const deletePost = async (id) => {
  ensureDbConfig();
  try {
    return await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
  } catch (err) {
    console.error("deletePost error:", err);
    throw err;
  }
};
