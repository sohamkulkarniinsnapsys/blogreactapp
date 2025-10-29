// src/pages/Login.jsx
import React, { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { login as appLogin } from "../services/appwrite";
import { AuthContext } from "../context/AuthContext";
import Input from "../components/Input";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError(""); // Clear previous errors
    try {
      const user = await appLogin(data.email, data.password);
      setUser(user);
      navigate("/dashboard");
    } catch (err) {
      // Show error to user
      const msg = err?.message || "Login failed. Please check your credentials.";
      setServerError(msg);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Login</h2>

        {/* Server / Appwrite Error */}
        {serverError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{serverError}</div>
        )}

        {/* Email */}
        <Input 
          label="Email" 
          type="email" 
          {...register("email", { required: "Email is required" })} 
          error={errors.email?.message}
        />

        {/* Password */}
        <Input 
          label="Password" 
          type="password" 
          {...register("password", { required: "Password is required" })} 
          error={errors.password?.message}
        />

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full mt-4" 
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
