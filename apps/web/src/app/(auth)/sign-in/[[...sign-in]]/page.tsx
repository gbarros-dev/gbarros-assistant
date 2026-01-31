import { SignIn } from "@clerk/nextjs";

import { ZenthorLogo } from "@/components/zenthor-logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <ZenthorLogo className="text-foreground h-10 w-auto" />
      <SignIn
        redirectUrl="/"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
      />
    </div>
  );
}
