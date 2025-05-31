"use client";

import { ScenarioEditorCharacterSettings } from "@/app/scenario-image-generator/_components/scenario-editor-character-settings";
import {
  type ScenarioCharacterData,
  ScenarioView,
} from "@/app/scenario-image-generator/_components/scenario-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationRef } from "@pixi/react";
import { PlusIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function ScenarioEditorView() {
  const applicationRef = useRef<ApplicationRef | null>(null);

  const [name, setName] = useState("Name");
  const [affiliation, setAffiliation] = useState<string>("Affiliation");
  const [content, setContent] = useState("Dialogue text goes here...");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [characters, setCharacters] = useState<
    (ScenarioCharacterData & {
      filename: string;
    })[]
  >([]);
  const [displayButtons, setDisplayButtons] = useState(true);
  const [autoEnabled, setAutoEnabled] = useState(false);

  const [backgroundName, setBackgroundName] = useState<string | null>(null);

  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const characterInputRef = useRef<HTMLInputElement | null>(null);

  function handleBackgroundImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setBackgroundImage(null);
      return;
    }

    const file = files[0];
    setBackgroundName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBackgroundImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleBackgroundImageClick() {
    if (backgroundInputRef.current) {
      backgroundInputRef.current.click();
    }
  }

  function handleRemoveBackgroundImage() {
    setBackgroundImage(null);
    setBackgroundName(null);
  }

  function handleCharacterImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCharacters((prev) => [
          ...prev,
          {
            spriteUrl: event.target?.result as string,
            x: 0,
            y: 0,
            scale: 1,
            filename: file.name,
          },
        ]);
      }
    };
    reader.readAsDataURL(file);

    if (characterInputRef.current) {
      characterInputRef.current.value = ""; // Reset the input value
    }
  }

  function handleAddCharacter() {
    if (characterInputRef.current) {
      characterInputRef.current.click();
    }
  }

  function renderCanvas() {
    const application = applicationRef.current?.getApplication();
    if (!application) {
      return null;
    }

    application.render();
    return application.canvas;
  }

  function handleCopyToClipboard() {
    const canvas = renderCanvas();

    canvas?.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]).then(() => {
        toast.success("Scenario image copied to clipboard!");
      });
    });
  }

  function handleDownloadImage() {
    const canvas = renderCanvas();

    canvas?.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "scenario.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  return (
    <div className="flex flex-col gap-6 items-center min-w-0">
      <div className="min-w-0">
        <ScenarioView
          applicationRef={applicationRef}
          content={content}
          name={name}
          affiliation={affiliation.length > 0 ? affiliation : undefined}
          displayButtons={displayButtons}
          autoEnabled={autoEnabled}
          backgroundImage={backgroundImage || undefined}
          characters={characters}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-10 w-full">
        <div className="flex flex-col gap-4">
          <div className="text-2xl font-semibold">Settings</div>

          <div className="grid grid-cols-3 gap-4">
            <Label htmlFor="name">Character Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter character name"
              className="col-span-2"
            />

            <Label htmlFor="affiliation">Affiliation (optional)</Label>
            <Input
              id="affiliation"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="Enter affiliation"
              className="col-span-2"
            />

            <Label htmlFor="content">Dialogue Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter dialogue content"
              className="h-24 col-span-2"
            />

            <Label htmlFor="backgroundImage">Background Image</Label>
            <div className="flex gap-2 col-span-2">
              <Button variant="outline" onClick={handleBackgroundImageClick}>
                {backgroundName || "Select Background Image"}
              </Button>

              {backgroundImage && (
                <Button variant="outline" onClick={handleRemoveBackgroundImage}>
                  <XIcon />
                </Button>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageChange}
                ref={backgroundInputRef}
                className="hidden"
              />
            </div>

            <Label htmlFor="displayButtons">Display Buttons</Label>
            <Switch
              id="displayButtons"
              checked={displayButtons}
              onCheckedChange={(checked) => setDisplayButtons(checked)}
              className="col-span-2"
            />

            <Label htmlFor="autoEnabled">Auto Enabled</Label>
            <Switch
              id="autoEnabled"
              checked={autoEnabled}
              onCheckedChange={(checked) => setAutoEnabled(checked)}
              className="col-span-2"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-2xl font-semibold">Characters</div>

          {characters.map((character, idx) => (
            <ScenarioEditorCharacterSettings
              key={idx}
              spriteUrl={character.spriteUrl}
              filename={character.filename}
              x={character.x}
              y={character.y}
              scale={character.scale}
              onChange={(updatedCharacter) => {
                setCharacters((prev) =>
                  prev.map((c, i) =>
                    i === idx ? { ...c, ...updatedCharacter } : c,
                  ),
                );
              }}
              onDelete={() => {
                setCharacters((prev) => prev.filter((_, i) => i !== idx));
              }}
            />
          ))}

          <Button variant="outline" onClick={handleAddCharacter}>
            <PlusIcon className="mr-2" />
            Add Character
          </Button>

          <input
            ref={characterInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCharacterImageSelect}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleCopyToClipboard}>Copy to Clipboard</Button>
        <Button onClick={handleDownloadImage}>Download Image</Button>
      </div>
    </div>
  );
}
