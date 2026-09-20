import { Plana } from "@/components/plana";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex flex-col gap-10 p-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold">Page not found</h1>
            <p>The page you are looking for does not exist.</p>
          </div>

          <div className="fixed md:absolute z-20 md:z-0 -bottom-30 md:-bottom-10 left-1/2 -translate-x-1/2">
            <Plana expression="confused" inline />
          </div>
        </div>
      </body>
    </html>
  );
}
