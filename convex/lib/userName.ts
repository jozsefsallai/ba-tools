const REAL_NAME_PROVIDERS = new Set([
  "google",
  "oauth_google",
]);

const DISPLAY_NAME_PROVIDERS = new Set([
  "discord",
  "oauth_discord",
]);

export type ClerkNameSource = {
  firstName?: string | null;
  lastName?: string | null;
  externalAccounts: {
    provider: string;
    firstName?: string | null;
    lastName?: string | null;
  }[];
};

export type AcceptedNames = {
  firstName: string;
  lastName: string;
};

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function realNamesOf(source: ClerkNameSource) {
  return new Set(
    source.externalAccounts
      .filter((account) => REAL_NAME_PROVIDERS.has(account.provider))
      .flatMap((account) => [
        normalize(account.firstName),
        normalize(account.lastName),
      ])
      .filter(Boolean),
  );
}

function displayNamesOf(source: ClerkNameSource) {
  return source.externalAccounts
    .filter((account) => DISPLAY_NAME_PROVIDERS.has(account.provider))
    .map((account) => account.firstName?.trim() ?? "")
    .filter(Boolean);
}

export function withoutProviderNames(source: ClerkNameSource): AcceptedNames {
  const realNames = realNamesOf(source);
  const displayNames = displayNamesOf(source);

  const firstName = source.firstName?.trim() ?? "";
  const lastName = source.lastName?.trim() ?? "";
  const isDisplayName = displayNames.some(
    (name) => normalize(name) === normalize(firstName),
  );

  return {
    firstName:
      isDisplayName || !realNames.has(normalize(firstName))
        ? firstName
        : (displayNames[0] ?? ""),
    lastName: realNames.has(normalize(lastName)) ? "" : lastName,
  };
}

export function acceptNames({
  previous,
  current,
  googleFillIn,
}: {
  previous: AcceptedNames | undefined;
  current: ClerkNameSource;
  googleFillIn: boolean;
}): AcceptedNames {
  if (!previous) {
    return withoutProviderNames(current);
  }

  const realNames = realNamesOf(current);
  const displayNames = displayNamesOf(current).map(normalize);

  const accept = (value: string, before: string, isFirstName: boolean) => {
    const filledByGoogle =
      googleFillIn &&
      !before &&
      realNames.has(normalize(value)) &&
      !(isFirstName && displayNames.includes(normalize(value)));

    return filledByGoogle ? before : value;
  };

  return {
    firstName: accept(
      current.firstName?.trim() ?? "",
      previous.firstName,
      true,
    ),
    lastName: accept(current.lastName?.trim() ?? "", previous.lastName, false),
  };
}

export function displayNameOf({ firstName, lastName }: AcceptedNames) {
  const name = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return name || undefined;
}
