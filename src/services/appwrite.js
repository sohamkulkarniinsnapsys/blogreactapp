import { Client, Account, Databases, ID } from "appwrite";

const client = new Client();
client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

// Authentication
export const signup = async (email, password, name) => {
  try {
    return await account.create(ID.unique(), email, password, name);
  } catch (err) {
    throw err;
  }
};

export const login = async (email, password) => {
  try {
    return await account.createEmailSession(email, password);
  } catch (err) {
    throw err;
  }
};

export const logout = async () => {
  try {
    return await account.deleteSession("current");
  } catch (err) {
    throw err;
  }
};

export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch (err) {
    return null;
  }
};

// Blog CRUD
export const createPost = async (title, content) => {
  try {
    return await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
      title,
      content,
    });
  } catch (err) {
    throw err;
  }
};

export const getPosts = async () => {
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    return result.documents;
  } catch (err) {
    throw err;
  }
};

export const getPost = async (id) => {
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTION_ID, id);
  } catch (err) {
    throw err;
  }
};

export const updatePost = async (id, title, content) => {
  try {
    return await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, { title, content });
  } catch (err) {
    throw err;
  }
};

export const deletePost = async (id) => {
  try {
    return await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
  } catch (err) {
    throw err;
  }
};
