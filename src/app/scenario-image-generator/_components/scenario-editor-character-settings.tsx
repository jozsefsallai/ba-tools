"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef } from "react";

export type ScenarioEditorCharacterSettingsProps = {
  spriteUrl: string;
  filename: string;
  x: number;
  y: number;
  scale: number;

  onChange: (settings: {
    spriteUrl: string;
    filename: string;
    x: number;
    y: number;
    scale: number;
  }) => void;

  onDelete?: () => void;
};

export function ScenarioEditorCharacterSettings({
  spriteUrl,
  filename,
  x,
  y,
  scale,
  onChange,
  onDelete,
}: ScenarioEditorCharacterSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange({
          spriteUrl: event.target.result as string,
          filename: file.name,
          x,
          y,
          scale,
        });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleFileInputClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  return (
    <div className="border rounded-md px-6 py-4 flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-4">
        <Label htmlFor="spriteUrl">Sprite</Label>
        <div className="col-span-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleFileInputClick}
          >
            {filename ?? "Select Sprite"}
          </Button>

          <input
            id="spriteUrl"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <Label htmlFor="x">X</Label>
        <Input
          id="x"
          type="number"
          value={x.toString()}
          onChange={(e) =>
            onChange({ spriteUrl, filename, x: +e.target.value, y, scale })
          }
          className="col-span-2"
        />

        <Label htmlFor="y">Y</Label>
        <Input
          id="y"
          type="number"
          value={y.toString()}
          onChange={(e) =>
            onChange({ spriteUrl, filename, x, y: +e.target.value, scale })
          }
          className="col-span-2"
        />

        <Label htmlFor="scale">Scale</Label>
        <Input
          id="scale"
          type="number"
          value={scale.toString()}
          onChange={(e) =>
            onChange({ spriteUrl, filename, x, y, scale: +e.target.value })
          }
          className="col-span-2"
        />
      </div>

      <div className="flex justify-end mt-4">
        <Button variant="destructive" onClick={onDelete}>
          Delete Character
        </Button>
      </div>
    </div>
  );
}
