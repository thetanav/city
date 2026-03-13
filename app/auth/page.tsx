import SignIn from "@/components/auth/sign-in";
import Logo from "@/components/logo";

export default function Page() {
  return (
    <div className="h-[90vh] flex items-center justify-center flex-col gap-12">
      <Logo className="h-8 fill-blue-600" />
      <SignIn />
    </div>
  );
}
