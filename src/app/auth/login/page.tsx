import { Suspense } from "react";
import { LoginForm } from "./login-form";

function LoginPageContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
