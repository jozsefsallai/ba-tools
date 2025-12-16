import { Button } from "@/components/ui/button";
import { CoffeeIcon } from "lucide-react";

export function DonationBox() {
  return (
    <section className="flex flex-col gap-4 text-sm">
      <h2 className="text-2xl">Donation Box</h2>

      <p>
        The tools on this site are completely free to use and that will never
        change. I do this as a hobby and for my love of the game and I want to
        help the community with my creations. The operation costs of the site
        are minimal and I am more than willing to pay for the occasional costs
        out of my own pocket.
      </p>

      <p>
        The best way for you to support the site is to report any issues that
        may arise while using the tools or suggest new features and tools that
        you would like to see.
      </p>

      <p>
        I don't expect any monetary compensation for these tools, but if you
        really want to support what I do, you can buy me a coffee using the link
        below. Your support is greatly appreciated!
      </p>

      <Button variant="outline" asChild>
        <a
          href="https://buymeacoffee.com/joexyz"
          target="_blank"
          rel="noreferrer noopener"
        >
          <CoffeeIcon />
          Buy me a coffee
        </a>
      </Button>
    </section>
  );
}
