import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { signup as appSignup } from "../services/appwrite";
import Input from "../components/Input";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      await appSignup(data.email, data.password, data.name);
      navigate("/login");
    } catch (err) {
      console.error("Signup error:", err);

      // General server error
      setServerError(err?.message || "Signup failed");

      // Field-specific Appwrite errors (if available)
      if (err?.response?.body?.email) {
        setError("email", { type: "manual", message: err.response.body.email });
      }
      if (err?.response?.body?.password) {
        setError("password", { type: "manual", message: err.response.body.password });
      }
      if (err?.response?.body?.name) {
        setError("name", { type: "manual", message: err.response.body.name });
      }
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
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Create an account</h2>

        {/* General server error */}
        {serverError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{serverError}</div>
        )}

        {/* Full Name */}
        <Input
          label="Full name"
          {...register("name", { required: "Name is required" })}
          error={errors.name?.message} // Pass error to Input
        />

        {/* Email */}
        <Input
          label="Email"
          type="email"
          {...register("email", { required: "Email is required" })}
          error={errors.email?.message} // Pass error to Input
        />

        {/* Password */}
        <Input
          label="Password"
          type="password"
          {...register("password", {
            required: "Password is required",
            minLength: { value: 8, message: "Password must be at least 8 characters" },
          })}
          error={errors.password?.message} // Pass error to Input
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Sign up"}
        </Button>
      </form>
    </div>
  );
}
