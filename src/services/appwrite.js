// src/services/appwrite.js
import { Client, Account, Databases, ID } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

// Helpful runtime checks (will be undefined on build if env missing)
if (!import.meta.env.VITE_APPWRITE_ENDPOINT) {
  console.error("[Appwrite] VITE_APPWRITE_ENDPOINT not set");
}
if (!DATABASE_ID || !COLLECTION_ID) {
  console.warn("[Appwrite] DATABASE_ID or COLLECTION_ID missing. CRUD will fail until set.");
}

// Signup
export const signup = async (email, password, name) => {
  try {
    return await account.create(ID.unique(), email, password, name);
  } catch (err) {
    console.error("signup error:", err);
    throw err;
  }
};

// Login - tolerant implementation to avoid SDK method mismatches in various versions
export const login = async (email, password) => {
  try {
    // Some SDK versions use createEmailSession, others createEmailPasswordSession
    if (typeof account.createEmailSession === "function") {
      await account.createEmailSession(email, password);
    } else if (typeof account.createEmailPasswordSession === "function") {
      await account.createEmailPasswordSession(email, password);
    } else {
      throw new Error("No available session creation method on Appwrite Account.");
    }
    // return the current user object
    return await account.get();
  } catch (err) {
    console.error("login error:", err);
    throw err;
  }
};

// Logout
export const logout = async () => {
  try {
    return await account.deleteSession("current");
  } catch (err) {
    console.error("logout error:", err);
    throw err;
  }
};

// Get current user (returns null if not logged in)
export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch (err) {
    return null;
  }
};

// CRUD helpers (validate env presence)
function ensureDbConfig() {
  if (!DATABASE_ID) throw new Error("DATABASE_ID is not configured (VITE_APPWRITE_DATABASE_ID).");
  if (!COLLECTION_ID) throw new Error("COLLECTION_ID is not configured (VITE_APPWRITE_COLLECTION_ID).");
}

export const createPost = async (title, content) => {
  ensureDbConfig();
  try {
    return await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), { title, content });
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

export const updatePost = async (id, title, content) => {
  ensureDbConfig();
  try {
    return await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, { title, content });
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
