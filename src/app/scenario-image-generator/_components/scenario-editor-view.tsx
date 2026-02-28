"use client";

import { ScenarioEditorCharacterSettings } from "@/app/scenario-image-generator/_components/scenario-editor-character-settings";
import {
  SCENARIO_FONT_EN,
  SCENARIO_FONTS,
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
import { GlobeIcon, ImageIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { useScenarioData } from "@/app/scenario-image-generator/_hooks/use-scenario-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ScenarioEditorView() {
  const t = useTranslations();
  const {
    applicationRef,
    backgroundMode,
    setBackgroundMode,
    name,
    setName,
    affiliation,
    setAffiliation,
    content,
    setContent,
    font,
    setFont,
    fontSize,
    setFontSize,
    scrollSpeed,
    setScrollSpeed,
    backgroundImage,
    setBackgroundImage,
    backgroundUrl,
    setBackgroundUrl,
    characters,
    setCharacters,
    displayButtons,
    setDisplayButtons,
    autoEnabled,
    setAutoEnabled,
    displayLine,
    setDisplayLine,
    displayGradient,
    setDisplayGradient,
    displayTriangle,
    setDisplayTriangle,
    transparentBackground,
    setTransparentBackground,

    animate,
    setAnimate,
    recordingMode,
    setRecordingMode,

    backgroundName,
    setBackgroundName,

    backgroundInputRef,
    characterInputRef,

    background,

    backgroundScale,
    backgroundXOffset,
    backgroundYOffset,
    setBackgroundScale,
    setBackgroundXOffset,
    setBackgroundYOffset,
  } = useScenarioData();

  const [backgroundScaleStr, setBackgroundScaleStr] = useState(
    backgroundScale.toString(),
  );

  const [backgroundXOffsetStr, setBackgroundXOffsetStr] = useState(
    backgroundXOffset.toString(),
  );

  const [backgroundYOffsetStr, setBackgroundYOffsetStr] = useState(
    backgroundYOffset.toString(),
  );

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
            timestamp: Date.now(),
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
        timestamp: Date.now(),
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
        toast.success(t("tools.scenarioImageGenerator.toasts.copied"));
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

  useEffect(() => {
    const newScale = Number.parseFloat(backgroundScaleStr);
    const newXOffset = Number.parseFloat(backgroundXOffsetStr);
    const newYOffset = Number.parseFloat(backgroundYOffsetStr);

    if (
      !Number.isNaN(newScale) &&
      !Number.isNaN(newXOffset) &&
      !Number.isNaN(newYOffset)
    ) {
      setBackgroundScale(newScale);
      setBackgroundXOffset(newXOffset);
      setBackgroundYOffset(newYOffset);
    }
  }, [backgroundScaleStr, backgroundXOffsetStr, backgroundYOffsetStr]);

  return (
    <div className="flex flex-col gap-6 items-center min-w-0">
      <div className="min-w-0">
        <ScenarioView
          applicationRef={applicationRef}
          animate={animate}
          content={content}
          font={font}
          fontSize={fontSize}
          scrollSpeed={scrollSpeed}
          name={name}
          affiliation={affiliation.length > 0 ? affiliation : undefined}
          displayButtons={displayButtons}
          displayLine={displayLine}
          displayGradient={displayGradient}
          displayTriangle={displayTriangle}
          transparentBackground={transparentBackground}
          autoEnabled={autoEnabled}
          backgroundImage={background ?? undefined}
          backgroundScale={backgroundScale}
          backgroundXOffset={backgroundXOffset}
          backgroundYOffset={backgroundYOffset}
          characters={characters}
          recordingMode={recordingMode}
        />
      </div>

      <Separator />

      <div className="flex gap-4">
        <Button onClick={() => setAnimate((prev) => !prev)}>
          {animate ? t("tools.scenarioImageGenerator.stopAnimation") : t("tools.scenarioImageGenerator.startAnimation")}
        </Button>

        <Button disabled={animate} onClick={() => setRecordingMode(true)}>
          {t("tools.scenarioImageGenerator.recordingMode")}
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
        <Card>
          <CardHeader>
            <CardTitle>{t("tools.scenarioImageGenerator.settings")}</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="content" className="gap-4">
              <TabsList className="place-self-center">
                <TabsTrigger value="content">{t("tools.scenarioImageGenerator.tabs.content")}</TabsTrigger>
                <TabsTrigger value="background">{t("tools.scenarioImageGenerator.tabs.background")}</TabsTrigger>
                <TabsTrigger value="font">{t("tools.scenarioImageGenerator.tabs.font")}</TabsTrigger>
                <TabsTrigger value="elements">{t("tools.scenarioImageGenerator.tabs.elements")}</TabsTrigger>
                <TabsTrigger value="behavior">{t("tools.scenarioImageGenerator.tabs.behavior")}</TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Label htmlFor="name">{t("tools.scenarioImageGenerator.content.characterName")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("tools.scenarioImageGenerator.content.characterNamePlaceholder")}
                    className="col-span-2"
                  />

                  <Label htmlFor="affiliation">{t("tools.scenarioImageGenerator.content.affiliation")}</Label>
                  <Input
                    id="affiliation"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    placeholder={t("tools.scenarioImageGenerator.content.affiliationPlaceholder")}
                    className="col-span-2"
                  />

                  <Label htmlFor="content">{t("tools.scenarioImageGenerator.content.dialogueContent")}</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("tools.scenarioImageGenerator.content.dialoguePlaceholder")}
                    className="h-24 col-span-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="background">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Label
                    htmlFor={
                      backgroundMode === "image"
                        ? "backgroundImage"
                        : "backgroundUrl"
                    }
                  >
                    {t("tools.scenarioImageGenerator.background.backgroundImage")}
                  </Label>
                  <div className="flex gap-2 col-span-2">
                    {backgroundMode === "image" && (
                      <Button
                        variant="outline"
                        onClick={handleBackgroundImageClick}
                        className="flex-1"
                      >
                        {backgroundName || t("tools.scenarioImageGenerator.background.selectBackgroundImage")}
                      </Button>
                    )}

                    {backgroundMode === "image" && backgroundImage && (
                      <Button
                        variant="outline"
                        onClick={handleRemoveBackgroundImage}
                      >
                        <XIcon />
                      </Button>
                    )}

                    {backgroundMode === "url" && (
                      <Input
                        id="backgroundUrl"
                        type="url"
                        value={backgroundUrl ?? ""}
                        onChange={(e) => setBackgroundUrl(e.target.value)}
                        placeholder={t("tools.scenarioImageGenerator.background.backgroundUrl")}
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

                  <Label htmlFor="backgroundScale">
                    {t("tools.scenarioImageGenerator.background.backgroundScale")}
                  </Label>

                  <Input
                    id="backgroundScale"
                    type="number"
                    value={backgroundScaleStr}
                    onChange={(e) => setBackgroundScaleStr(e.target.value)}
                    placeholder={t("tools.scenarioImageGenerator.background.backgroundScalePlaceholder")}
                    className="col-span-2"
                  />

                  <Label htmlFor="backgroundXOffset">{t("tools.scenarioImageGenerator.background.backgroundXOffset")}</Label>
                  <Input
                    id="backgroundXOffset"
                    type="number"
                    value={backgroundXOffsetStr}
                    onChange={(e) => setBackgroundXOffsetStr(e.target.value)}
                    placeholder={t("tools.scenarioImageGenerator.background.backgroundXOffsetPlaceholder")}
                    className="col-span-2"
                  />

                  <Label htmlFor="backgroundYOffset">{t("tools.scenarioImageGenerator.background.backgroundYOffset")}</Label>
                  <Input
                    id="backgroundYOffset"
                    type="number"
                    value={backgroundYOffsetStr}
                    onChange={(e) => setBackgroundYOffsetStr(e.target.value)}
                    placeholder={t("tools.scenarioImageGenerator.background.backgroundYOffsetPlaceholder")}
                    className="col-span-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="font">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Label>{t("tools.scenarioImageGenerator.fontSettings.font")}</Label>
                  <div className="col-span-2">
                    <Select
                      value={font.family}
                      onValueChange={(value) =>
                        setFont(
                          SCENARIO_FONTS.find((f) => f.family === value) ||
                            SCENARIO_FONT_EN,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>{font.label}</SelectValue>
                      </SelectTrigger>

                      <SelectContent>
                        {SCENARIO_FONTS.map((f) => (
                          <SelectItem key={f.family} value={f.family}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Label htmlFor="fontSize">
                    {t("tools.scenarioImageGenerator.fontSettings.fontSize", { defaultSize: SCENARIO_TEXT_FONT_SIZE })}
                  </Label>
                  <Input
                    id="fontSize"
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    placeholder={t("tools.scenarioImageGenerator.fontSettings.fontSizePlaceholder")}
                    className="col-span-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="elements">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Label htmlFor="displayButtons">{t("tools.scenarioImageGenerator.elements.displayButtons")}</Label>
                  <Switch
                    id="displayButtons"
                    checked={displayButtons}
                    onCheckedChange={(checked) => setDisplayButtons(checked)}
                    className="col-span-2"
                  />

                  <Label htmlFor="autoEnabled">{t("tools.scenarioImageGenerator.elements.autoEnabled")}</Label>
                  <Switch
                    id="autoEnabled"
                    checked={autoEnabled}
                    onCheckedChange={(checked) => setAutoEnabled(checked)}
                    className="col-span-2"
                  />

                  <Label htmlFor="displayLine">{t("tools.scenarioImageGenerator.elements.displayHorizontalLine")}</Label>
                  <Switch
                    id="displayLine"
                    checked={displayLine}
                    onCheckedChange={(checked) => setDisplayLine(checked)}
                    className="col-span-2"
                  />

                  <Label htmlFor="displayGradient">{t("tools.scenarioImageGenerator.elements.displayGradient")}</Label>
                  <Switch
                    id="displayGradient"
                    checked={displayGradient}
                    onCheckedChange={(checked) => setDisplayGradient(checked)}
                    className="col-span-2"
                  />

                  <Label htmlFor="displayTriangle">{t("tools.scenarioImageGenerator.elements.displayTriangle")}</Label>
                  <Switch
                    id="displayTriangle"
                    checked={displayTriangle}
                    onCheckedChange={(checked) => setDisplayTriangle(checked)}
                    className="col-span-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="behavior">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Label htmlFor="scrollSpeed">
                    {t("tools.scenarioImageGenerator.behaviorSettings.textScrollSpeed", { defaultSpeed: SCENARIO_TEXT_SCROLL_SPEED })}
                  </Label>
                  <Input
                    id="scrollSpeed"
                    type="number"
                    value={scrollSpeed}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(e) => setScrollSpeed(Number(e.target.value))}
                    placeholder={t("tools.scenarioImageGenerator.behaviorSettings.scrollSpeedPlaceholder")}
                    className="col-span-2"
                  />

                  <Label htmlFor="transparentBackground">
                    {t("tools.scenarioImageGenerator.behaviorSettings.transparentBackground")}
                  </Label>
                  <Switch
                    id="transparentBackground"
                    checked={transparentBackground}
                    onCheckedChange={(checked) =>
                      setTransparentBackground(checked)
                    }
                    className="col-span-2"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("tools.scenarioImageGenerator.characters")}</CardTitle>
          </CardHeader>

          <CardContent>
            {characters.map((character, idx) => (
              <ScenarioEditorCharacterSettings
                key={character.timestamp}
                index={idx}
                total={characters.length}
                spriteUrl={character.spriteUrl}
                filename={character.filename}
                timestamp={character.timestamp}
                x={character.x}
                y={character.y}
                scale={character.scale}
                darken={character.darken}
                hologram={character.hologram}
                silhouette={character.silhouette}
                silhouetteColor={character.silhouetteColor}
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
                onMoveUp={() => {
                  setCharacters((prev) => {
                    const newCharacters = [...prev];
                    if (idx > 0) {
                      const temp = newCharacters[idx - 1];
                      newCharacters[idx - 1] = newCharacters[idx];
                      newCharacters[idx] = temp;
                    }
                    return newCharacters;
                  });
                }}
                onMoveDown={() => {
                  setCharacters((prev) => {
                    const newCharacters = [...prev];
                    if (idx < newCharacters.length - 1) {
                      const temp = newCharacters[idx + 1];
                      newCharacters[idx + 1] = newCharacters[idx];
                      newCharacters[idx] = temp;
                    }
                    return newCharacters;
                  });
                }}
              />
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" onClick={handleAddCharacter}>
                <PlusIcon className="mr-2" />
                {t("tools.scenarioImageGenerator.character.addCharacterFile")}
              </Button>

              <Button variant="outline" onClick={handleAddCharacterUrl}>
                <PlusIcon className="mr-2" />
                {t("tools.scenarioImageGenerator.character.addCharacterUrl")}
              </Button>
            </div>

            <input
              ref={characterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCharacterImageSelect}
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex gap-4">
        <Button onClick={handleCopyToClipboard}>{t("common.copyToClipboard")}</Button>
        <Button onClick={handleDownloadImage}>{t("common.downloadImage")}</Button>
      </div>

      {recordingMode && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black z-40" />
      )}

      {recordingMode && !animate && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-amber-800/60 text-white z-50 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center gap-4 w-lg">
            <h2 className="text-3xl font-semibold">{t("tools.scenarioImageGenerator.recording.title")}</h2>

            <p>
              {t("tools.scenarioImageGenerator.recording.description")}
            </p>

            <p>
              {t("tools.scenarioImageGenerator.recording.escHint")}
            </p>

            <Button
              onClick={() => setAnimate(true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {t("tools.scenarioImageGenerator.recording.start")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
