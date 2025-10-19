import type { Metadata } from "next";

import { MainContent } from "./_components/main-content";
import { Separator } from "@/components/ui/separator";
import { StackContainer } from "@/app/credits/_components/stack-container";

import { LicensesContent } from "@/app/credits/_components/licenses-content";

export const metadata: Metadata = {
  title: "Credits - Joe's Blue Archive Tools",
};

export default async function CreditsPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Credits</h1>
        <MainContent />

        <Separator />

        <h2 className="text-2xl font-bold">Tech Stack</h2>
        <StackContainer />

        <Separator />

        <h2 className="text-2xl font-bold">Licenses</h2>
        <LicensesContent />
      </div>
    </div>
  );
}
