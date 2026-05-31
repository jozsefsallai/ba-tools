"use client";

import { useQuery } from "convex/react";
import { api } from "~convex/api";

type DonationListProps = {
  supportersTitle: string;
  anonymousLabel: string;
  thankYouText: string;
};

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function DonationList({
  supportersTitle,
  anonymousLabel,
  thankYouText,
}: DonationListProps) {
  const donations = useQuery(api.donations.list, { limit: 20 });

  if (!donations || donations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 max-h-[250px]">
      <h3 className="font-semibold">{supportersTitle}</h3>

      <ul className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
        {donations.map((donation) => (
          <li
            key={donation._id}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate">
              {donation.supporterName?.trim() || anonymousLabel}
            </span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {formatAmount(donation.amount, donation.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="text-xs text-muted-foreground text-center">
        {thankYouText}
      </div>
    </div>
  );
}
