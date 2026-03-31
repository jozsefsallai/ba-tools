import { Button } from "@/components/ui/button";
import { CoffeeIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function DonationBox() {
  const t = await getTranslations();

  return (
    <section className="flex flex-col gap-4 text-sm border-4 border-[#ff6600] bg-[#ffff00] dark:bg-[#442200] p-4 shadow-lg">
      <h2 className="text-2xl font-heading text-[#ff0000] dark:text-[#ffff00]">
        <span className="blink font-bold">PLEASE DONATE</span> —{" "}
        {t("static.home.donation.title")}
      </h2>

      <p className="comic-sans text-[#000080] dark:text-[#ccffcc]">
        {t("static.home.donation.p1")}
      </p>

      <p style={{ color: "#cc0000" }}>{t("static.home.donation.p2")}</p>

      <p style={{ color: "#006600" }}>{t("static.home.donation.p3")}</p>

      <Button variant="outline" asChild>
        <a
          href="https://buymeacoffee.com/joexyz"
          target="_blank"
          rel="noreferrer noopener"
        >
          <CoffeeIcon />
          {t("static.home.donation.cta")}
        </a>
      </Button>
    </section>
  );
}
