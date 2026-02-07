"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { PhoneVerification } from "@/components/settings/phone-verification";

export default function SettingsPage() {
  return (
    <PageWrapper title="Settings" maxWidth="md">
      <div className="flex flex-col gap-8">
        <PhoneVerification />
      </div>
    </PageWrapper>
  );
}
