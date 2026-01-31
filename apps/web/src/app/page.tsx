"use client";

import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ZenthorLogo } from "@/components/zenthor-logo";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6">
      {/* Gradient orbs */}
      <div
        className="pointer-events-none absolute top-[-10%] left-[15%] h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.55 0.14 175) 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute right-[10%] bottom-[5%] h-[400px] w-[400px] rounded-full opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.75 0.11 85) 0%, transparent 70%)",
          animation: "float 10s ease-in-out infinite 2s",
        }}
      />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <ZenthorLogo className="text-foreground h-12 w-auto" />

        <p className="text-muted-foreground max-w-md text-lg">
          Your intelligent companion for every conversation.
        </p>

        <div className="flex gap-3">
          <Button nativeButton={false} size="lg" render={<Link href="/chat" />}>
            Start chatting
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="lg"
            render={<Link href={"/sign-in" as "/"} />}
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
