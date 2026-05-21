import { AuthForm } from "@/components/AuthForm";
import { signUpAction } from "@/app/actions";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-up" action={signUpAction} error={params.error} />;
}
