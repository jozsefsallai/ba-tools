"use client";

import {
  clearPlanaConfig,
  getPlanaConfigStatus,
  savePlanaConfig,
} from "@/actions/plana-config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type PropsWithChildren,
  useEffect,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

type Provider = "openrouter" | "gateway";

const DEFAULT_CHAT_MODELS: Record<Provider, string> = {
  gateway: "deepseek/deepseek-v3.1",
  openrouter: "deepseek/deepseek-v4-flash",
};

export function PlanaSettingsDialog({ children }: PropsWithChildren) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [chatModel, setChatModel] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    startTransition(async () => {
      const status = await getPlanaConfigStatus();

      setProvider(status.provider ?? "openrouter");
      setChatModel(status.chatModel ?? "");
      setHasSavedKey(status.hasKey);
      setApiKey("");
    });
  }, [open]);

  function handleSave() {
    startTransition(async () => {
      try {
        await savePlanaConfig({
          apiKey,
          chatModel: chatModel.trim() || undefined,
          provider,
        });
        setHasSavedKey(true);
        setApiKey("");
        toast.success(t("tools.plana.settings.toasts.saved"));
        setOpen(false);
      } catch {
        toast.error(t("tools.plana.settings.toasts.failed"));
      }
    });
  }

  function handleClear() {
    startTransition(async () => {
      try {
        await clearPlanaConfig();
        setApiKey("");
        setChatModel("");
        setHasSavedKey(false);
        setProvider("openrouter");
        toast.success(t("tools.plana.settings.toasts.cleared"));
      } catch {
        toast.error(t("tools.plana.settings.toasts.failed"));
      }
    });
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tools.plana.settings.title")}</DialogTitle>
          <DialogDescription>
            {t("tools.plana.settings.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="plana-provider">
              {t("tools.plana.settings.provider")}
            </Label>
            <Select
              disabled={isPending}
              onValueChange={(value) => setProvider(value as Provider)}
              value={provider}
            >
              <SelectTrigger id="plana-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">
                  {t("tools.plana.settings.providers.openrouter")}
                </SelectItem>
                <SelectItem value="gateway">
                  {t("tools.plana.settings.providers.gateway")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="plana-api-key">
              {t("tools.plana.settings.apiKey")}
            </Label>
            <div className="flex gap-2">
              <Input
                autoComplete="off"
                disabled={isPending}
                id="plana-api-key"
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  hasSavedKey
                    ? t("tools.plana.settings.apiKeyPlaceholderSaved")
                    : t("tools.plana.settings.apiKeyPlaceholderEmpty")
                }
                type={showApiKey ? "text" : "password"}
                value={apiKey}
              />
              <Button
                aria-label={t("tools.plana.settings.toggleApiKeyVisibility")}
                onClick={() => setShowApiKey((visible) => !visible)}
                size="icon"
                type="button"
                variant="outline"
              >
                {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="plana-chat-model">
              {t("tools.plana.settings.chatModel")}
            </Label>
            <Input
              disabled={isPending}
              id="plana-chat-model"
              onChange={(event) => setChatModel(event.target.value)}
              placeholder={DEFAULT_CHAT_MODELS[provider]}
              value={chatModel}
            />
          </div>

          <p className="text-muted-foreground text-sm">
            {provider === "openrouter" ? (
              <a
                className="underline underline-offset-4"
                href="https://openrouter.ai/keys"
                rel="noreferrer"
                target="_blank"
              >
                {t("tools.plana.settings.providerHelp.openrouter")}
              </a>
            ) : (
              <a
                className="underline underline-offset-4"
                href="https://vercel.com/docs/ai-gateway"
                rel="noreferrer"
                target="_blank"
              >
                {t("tools.plana.settings.providerHelp.gateway")}
              </a>
            )}
          </p>
        </div>

        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={handleClear}
            type="button"
            variant="outline"
          >
            {t("tools.plana.settings.clear")}
          </Button>
          <Button
            disabled={isPending || !apiKey.trim()}
            onClick={handleSave}
            type="button"
          >
            {t("tools.plana.settings.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
