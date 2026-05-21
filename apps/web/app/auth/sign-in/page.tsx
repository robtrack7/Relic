import { AuthForm } from "@/components/AuthForm";
import { signInAction } from "@/app/actions";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-in" action={signInAction} error={params.error} />;
}
