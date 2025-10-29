// src/pages/Signup.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { signup as appSignup } from "../services/appwrite";
import Input from "../components/Input";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    try {
      await appSignup(data.email, data.password, data.name);
      navigate("/login");
    } catch (err) {
      setError(err?.message || "Signup failed");
      console.error("Signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Create an account</h2>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <Input label="Full name" {...register("name", { required: true })} />
        <Input label="Email" type="email" {...register("email", { required: true })} />
        <Input label="Password" type="password" {...register("password", { required: true })} />
        <Button className="w-full" type="submit" disabled={loading}>{loading ? "Signing up..." : "Sign up"}</Button>
      </form>
    </div>
  );
}
