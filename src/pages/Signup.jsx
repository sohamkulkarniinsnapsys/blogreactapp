import { useForm } from "react-hook-form";
import { signup } from "../services/appwrite";
import { useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";

export default function Signup() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await signup(data.email, data.password, data.name);
      navigate("/login");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Signup</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input label="Name" {...register("name")} />
        <Input label="Email" type="email" {...register("email")} />
        <Input label="Password" type="password" {...register("password")} />
        <Button type="submit">Signup</Button>
      </form>
    </div>
  );
}
