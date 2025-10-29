// src/services/appwrite.js
import { Client, Account, Databases, ID, Storage } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // include /v1
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
export const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!import.meta.env.VITE_APPWRITE_ENDPOINT) {
  console.error("[Appwrite] VITE_APPWRITE_ENDPOINT not set");
}
if (!DATABASE_ID || !COLLECTION_ID) {
  console.warn("[Appwrite] DATABASE_ID or COLLECTION_ID missing. CRUD will fail until set.");
}
if (!BUCKET_ID) {
  console.warn("[Appwrite] BUCKET_ID not configured. Image uploads will fail.");
}

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
    if (typeof account.createEmailSession === "function") {
      await account.createEmailSession(email, password);
    } else if (typeof account.createEmailPasswordSession === "function") {
      await account.createEmailPasswordSession(email, password);
    } else {
      throw new Error("No available session creation method on Appwrite Account.");
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
// Storage helpers
// -----------------
export const uploadImage = async (file) => {
  if (!BUCKET_ID) throw new Error("BUCKET_ID is not configured (VITE_APPWRITE_BUCKET_ID).");
  try {
    const res = await storage.createFile(BUCKET_ID, ID.unique(), file);
    return res.$id;
  } catch (err) {
    console.error("uploadImage error:", err);
    throw err;
  }
};

export const getFileViewUrl = (fileId) => {
  if (!fileId) return "";
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT.replace(/\/$/, "");
  return `${endpoint}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
};

// -----------------
// CRUD helpers
// -----------------
function ensureDbConfig() {
  if (!DATABASE_ID) throw new Error("DATABASE_ID is not configured.");
  if (!COLLECTION_ID) throw new Error("COLLECTION_ID is not configured.");
}

export const createPost = async (title, content, imageFile, userId) => {
  ensureDbConfig();
  if (!imageFile) throw new Error("Image required for post creation.");
  if (!userId) throw new Error("userID is required for post creation.");

  try {
    const fileId = await uploadImage(imageFile);
    const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
      title,
      content,
      image: fileId,
      userID: userId, // required for schema
    });
    return doc;
  } catch (err) {
    console.error("createPost error:", err);
    throw err;
  }
};

export const getPosts = async () => {
  ensureDbConfig();
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    return res.documents || [];
  } catch (err) {
    console.error("getPosts error:", err);
    throw err;
  }
};

export const getPost = async (id) => {
  ensureDbConfig();
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTION_ID, id);
  } catch (err) {
    console.error("getPost error:", err);
    throw err;
  }
};

export const updatePost = async (id, title, content, imageFile) => {
  ensureDbConfig();
  try {
    const payload = { title, content };
    if (imageFile) payload.image = await uploadImage(imageFile);
    return await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, payload);
  } catch (err) {
    console.error("updatePost error:", err);
    throw err;
  }
};

export const deletePost = async (id) => {
  ensureDbConfig();
  try {
    return await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
  } catch (err) {
    console.error("deletePost error:", err);
    throw err;
  }
};
