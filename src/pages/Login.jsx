import { useForm } from "react-hook-form";
import { login } from "../services/appwrite";
import { useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";

export default function Login() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input label="Email" type="email" {...register("email")} />
        <Input label="Password" type="password" {...register("password")} />
        <Button type="submit">Login</Button>
      </form>
    </div>
  );
}
