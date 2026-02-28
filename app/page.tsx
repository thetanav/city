import SignIn from "@/components/auth/sign-in";
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome to City!</h1>
      <p className="my-4">
        A modern event management platform built for performance and
        scalability.
      </p>
      <div>
        <SignIn />
      </div>
    </div>
  );
}
