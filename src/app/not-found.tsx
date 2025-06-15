"use client";

import { Plana } from "@/components/plana";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">404 - Page Not Found</h1>
        </div>

        <p>The page you are looking for does not exist.</p>
      </div>

      <div className="absolute -bottom-50 md:-bottom-10 left-1/2 -translate-x-1/2">
        <Plana expression="confused" inline />
      </div>
    </div>
  );
}
