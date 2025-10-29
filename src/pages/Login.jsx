// src/pages/Login.jsx
import React, { useContext } from "react";
import { useForm } from "react-hook-form";
import { login as appLogin } from "../services/appwrite";
import { AuthContext } from "../context/AuthContext";
import Input from "../components/Input";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { register, handleSubmit, setError } = useForm();
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await appLogin(data.email, data.password);
      setUser(user);
      navigate("/dashboard");
    } catch (err) {
      const msg = err?.message || "Login failed";
      setError("email", { type: "manual", message: msg });
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Login</h2>
        <Input label="Email" type="email" {...register("email", { required: true })} />
        <Input label="Password" type="password" {...register("password", { required: true })} />
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
      </form>
    </div>
  );
}
