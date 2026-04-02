import { Button } from "@/components/ui/button";
import { CoffeeIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function DonationBox() {
  const t = await getTranslations();

  return (
    <section className="flex flex-col gap-4 text-sm">
      <h2 className="text-2xl">{t("static.home.donation.title")}</h2>

      <p>{t("static.home.donation.p1")}</p>

      <p>{t("static.home.donation.p2")}</p>

      <p>{t("static.home.donation.p3")}</p>

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
