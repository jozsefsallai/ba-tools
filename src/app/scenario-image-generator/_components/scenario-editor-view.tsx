"use client";

import { ScenarioEditorCharacterSettings } from "@/app/scenario-image-generator/_components/scenario-editor-character-settings";
import {
  type ScenarioCharacterData,
  ScenarioView,
} from "@/app/scenario-image-generator/_components/scenario-view";
import {
  SCENARIO_TEXT_FONT_SIZE,
  SCENARIO_TEXT_SCROLL_SPEED,
} from "@/app/scenario-image-generator/_lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationRef } from "@pixi/react";
import { GlobeIcon, ImageIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

type BackgroundMode = "image" | "url";

export function ScenarioEditorView() {
  const applicationRef = useRef<ApplicationRef | null>(null);

  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("image");

  const [name, setName] = useState("Name");
  const [affiliation, setAffiliation] = useState<string>("Affiliation");
  const [content, setContent] = useState("Dialogue text goes here...");
  const [fontSize, setFontSize] = useState(SCENARIO_TEXT_FONT_SIZE);
  const [scrollSpeed, setScrollSpeed] = useState(SCENARIO_TEXT_SCROLL_SPEED);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [characters, setCharacters] = useState<
    (ScenarioCharacterData & {
      filename: string;
    })[]
  >([]);
  const [displayButtons, setDisplayButtons] = useState(true);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [displayLine, setDisplayLine] = useState(true);
  const [displayGradient, setDisplayGradient] = useState(true);
  const [displayTriangle, setDisplayTriangle] = useState(true);

  const [animate, setAnimate] = useState(false);
  const [recordingMode, setRecordingMode] = useState(false);

  const [backgroundName, setBackgroundName] = useState<string | null>(null);

  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const characterInputRef = useRef<HTMLInputElement | null>(null);

  const background = useMemo(() => {
    switch (backgroundMode) {
      case "image":
        return backgroundImage;
      case "url":
        return backgroundUrl;
    }
  }, [backgroundMode, backgroundImage, backgroundUrl]);

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

  function handleAddCharacterUrl() {
    setCharacters((prev) => [
      ...prev,
      {
        spriteUrl: "",
        x: 0,
        y: 0,
        scale: 1,
        filename: "",
      },
    ]);
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

  useEffect(() => {
    if (recordingMode) {
      document.body.style.overflow = "hidden";

      document.documentElement.requestFullscreen?.().catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else {
      document.body.style.overflow = "auto";

      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error("Error exiting full-screen mode:", err);
        });
      }

      setAnimate(false);
    }
  }, [recordingMode]);

  useHotkeys("esc", () => setRecordingMode(false), {
    enabled: recordingMode,
    enableOnFormTags: true,
    enableOnContentEditable: true,
    preventDefault: true,
  });

  return (
    <div className="flex flex-col gap-6 items-center min-w-0">
      <div className="min-w-0">
        <ScenarioView
          applicationRef={applicationRef}
          animate={animate}
          content={content}
          fontSize={fontSize}
          scrollSpeed={scrollSpeed}
          name={name}
          affiliation={affiliation.length > 0 ? affiliation : undefined}
          displayButtons={displayButtons}
          displayLine={displayLine}
          displayGradient={displayGradient}
          displayTriangle={displayTriangle}
          autoEnabled={autoEnabled}
          backgroundImage={background ?? undefined}
          characters={characters}
          recordingMode={recordingMode}
        />
      </div>

      <Separator />

      <div className="flex gap-4">
        <Button onClick={() => setAnimate((prev) => !prev)}>
          {animate ? "Stop Animation" : "Start Animation"}
        </Button>

        <Button disabled={animate} onClick={() => setRecordingMode(true)}>
          Recording Mode
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
        <div className="flex flex-col gap-4">
          <div className="text-2xl font-semibold">Settings</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Label htmlFor="fontSize">
              Font Size (default: {SCENARIO_TEXT_FONT_SIZE})
            </Label>
            <Input
              id="fontSize"
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              placeholder="Enter font size"
              className="col-span-2"
            />

            <Label htmlFor="scrollSpeed">
              Text Scroll Speed (0-1, default: {SCENARIO_TEXT_SCROLL_SPEED})
            </Label>
            <Input
              id="scrollSpeed"
              type="number"
              value={scrollSpeed}
              min={0}
              max={1}
              step={0.01}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              placeholder="Enter scroll speed"
              className="col-span-2"
            />

            <Label
              htmlFor={
                backgroundMode === "image" ? "backgroundImage" : "backgroundUrl"
              }
            >
              Background Image
            </Label>
            <div className="flex gap-2 col-span-2">
              {backgroundMode === "image" && (
                <Button
                  variant="outline"
                  onClick={handleBackgroundImageClick}
                  className="flex-1"
                >
                  {backgroundName || "Select Background Image"}
                </Button>
              )}

              {backgroundMode === "image" && backgroundImage && (
                <Button variant="outline" onClick={handleRemoveBackgroundImage}>
                  <XIcon />
                </Button>
              )}

              {backgroundMode === "url" && (
                <Input
                  id="backgroundUrl"
                  type="url"
                  value={backgroundUrl ?? ""}
                  onChange={(e) => setBackgroundUrl(e.target.value)}
                  placeholder="Enter background image URL"
                  className="flex-1"
                />
              )}

              <Button
                variant="outline"
                onClick={() =>
                  setBackgroundMode((prev) =>
                    prev === "image" ? "url" : "image",
                  )
                }
                className="flex-shrink-0"
              >
                {backgroundMode === "image" && <GlobeIcon />}
                {backgroundMode === "url" && <ImageIcon />}
              </Button>

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

            <Label htmlFor="displayLine">Display Horizontal Line</Label>
            <Switch
              id="displayLine"
              checked={displayLine}
              onCheckedChange={(checked) => setDisplayLine(checked)}
              className="col-span-2"
            />

            <Label htmlFor="displayGradient">Display Gradient</Label>
            <Switch
              id="displayGradient"
              checked={displayGradient}
              onCheckedChange={(checked) => setDisplayGradient(checked)}
              className="col-span-2"
            />

            <Label htmlFor="displayTriangle">Display Triangle</Label>
            <Switch
              id="displayTriangle"
              checked={displayTriangle}
              onCheckedChange={(checked) => setDisplayTriangle(checked)}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={handleAddCharacter}>
              <PlusIcon className="mr-2" />
              Add Character (file)
            </Button>

            <Button variant="outline" onClick={handleAddCharacterUrl}>
              <PlusIcon className="mr-2" />
              Add Character (URL)
            </Button>
          </div>

          <input
            ref={characterInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCharacterImageSelect}
          />
        </div>
      </div>

      <Separator />

      <div className="flex gap-4">
        <Button onClick={handleCopyToClipboard}>Copy to Clipboard</Button>
        <Button onClick={handleDownloadImage}>Download Image</Button>
      </div>

      {recordingMode && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black z-40" />
      )}

      {recordingMode && !animate && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-amber-800/60 text-white z-50 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center gap-4 w-lg">
            <h2 className="text-3xl font-semibold">Recording Mode</h2>

            <p>
              You're about to enter recording mode. Prepare your screen
              recording software to capture the browser window. Click on the
              following button when you feel ready to start recording.
            </p>

            <p>
              You can quit recording mode by pressing the Esc key (twice if
              you're in full screen).
            </p>

            <Button
              onClick={() => setAnimate(true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Start Recording
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
