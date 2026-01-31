"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@gbarros-assistant/backend/convex/_generated/api";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";

import { ModeToggle } from "@/components/mode-toggle";
import { ZenthorMark } from "@/components/zenthor-logo";

export default function Dashboard() {
  const user = useUser();
  const privateData = useQuery(api.privateData.get);

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <ZenthorMark className="text-primary size-6" />
          <span className="font-display text-sm font-semibold">Zenthor</span>
        </div>
        <ModeToggle />
      </div>
      <Authenticated>
        <div className="p-4">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p>Welcome {user.user?.fullName}</p>
          <p>privateData: {privateData?.message}</p>
          <UserButton />
        </div>
      </Authenticated>
      <Unauthenticated>
        <div className="p-4">
          <SignInButton />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-4">Loading...</div>
      </AuthLoading>
    </>
  );
}
