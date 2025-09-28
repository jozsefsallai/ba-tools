"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/use-preferences";
import type { UserPreferences as UserPreferencesType } from "@/lib/user-preferences";
import { useState } from "react";
import { toast } from "sonner";

export function UserPreferences() {
  const { preferences, savePreferences } = useUserPreferences();

  const [newPreferences, setNewPreferences] = useState<UserPreferencesType>({
    ...preferences,
  });

  const [preferencesSaving, setPreferencesSaving] = useState(false);

  function setPreference<K extends keyof UserPreferencesType>(
    namespace: K,
    key: keyof UserPreferencesType[K],
    value: UserPreferencesType[K][keyof UserPreferencesType[K]],
  ) {
    setNewPreferences({
      ...newPreferences,
      [namespace]: {
        ...newPreferences[namespace],
        [key]: value,
      },
    });
  }

  async function handleSaveClick() {
    if (preferencesSaving) {
      return;
    }

    setPreferencesSaving(true);

    try {
      await savePreferences({
        timelineVisualizer: newPreferences.timelineVisualizer,
        formationDisplay: newPreferences.formationDisplay,
      });
      toast.success("Preferences saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save preferences.");
    } finally {
      setPreferencesSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">User Preferences</h1>

      <Separator />

      <div className="flex flex-col gap-4 text-sm">
        <h2 className="text-base font-semibold">Timeline Visualizer</h2>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label>Default scale</Label>

            <div>
              <Select
                value={newPreferences.timelineVisualizer.defaultScale.toString()}
                onValueChange={(value) =>
                  setPreference(
                    "timelineVisualizer",
                    "defaultScale",
                    Number.parseInt(value, 10),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent align="end" className="z-[10001]">
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label htmlFor="tl-default-item-spacing">
              Default item spacing
            </Label>

            <div>
              <Input
                id="tl-default-item-spacing"
                type="number"
                className="w-20"
                value={newPreferences.timelineVisualizer.defaultItemSpacing.toString()}
                onChange={(e) =>
                  setPreference(
                    "timelineVisualizer",
                    "defaultItemSpacing",
                    Number.parseInt(e.target.value, 10),
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label htmlFor="tl-default-vertical-separator-size">
              Default vertical separator size
            </Label>

            <div>
              <Input
                id="tl-default-vertical-separator-size"
                type="number"
                className="w-20"
                value={newPreferences.timelineVisualizer.defaultVerticalSeparatorSize.toString()}
                onChange={(e) =>
                  setPreference(
                    "timelineVisualizer",
                    "defaultVerticalSeparatorSize",
                    Number.parseInt(e.target.value, 10),
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label htmlFor="tl-default-horizontal-separator-size">
              Default horizontal separator size
            </Label>

            <div>
              <Input
                id="tl-default-horizontal-separator-size"
                type="number"
                className="w-20"
                value={newPreferences.timelineVisualizer.defaultHorizontalSeparatorSize.toString()}
                onChange={(e) =>
                  setPreference(
                    "timelineVisualizer",
                    "defaultHorizontalSeparatorSize",
                    Number.parseInt(e.target.value, 10),
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label htmlFor="tl-trigger-autofocus">Auto-focus on Trigger</Label>

            <Switch
              id="tl-trigger-autofocus"
              checked={newPreferences.timelineVisualizer.triggerAutoFocus}
              onCheckedChange={(checked) =>
                setPreference("timelineVisualizer", "triggerAutoFocus", checked)
              }
            />
          </div>

          <div className="text-xs text-muted-foreground">
            When enabled, the editor will automatically focus on the trigger
            field when selecting a student. You can then press Enter while in
            the trigger field to select a new student.
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4 text-sm">
        <h2 className="text-base font-semibold">Formation Display</h2>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label>Default scale</Label>

            <div>
              <Select
                value={newPreferences.formationDisplay.defaultScale.toString()}
                onValueChange={(value) =>
                  setPreference(
                    "formationDisplay",
                    "defaultScale",
                    Number.parseInt(value, 10),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent align="end" className="z-[10001]">
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label htmlFor="echelontool-display-overline">
              Default display overline
            </Label>

            <Switch
              id="echelontool-display-overline"
              checked={newPreferences.formationDisplay.defaultDisplayOverline}
              onCheckedChange={(checked) =>
                setPreference(
                  "formationDisplay",
                  "defaultDisplayOverline",
                  checked,
                )
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label htmlFor="echelontool-display-role">
              Default display role icons
            </Label>

            <Switch
              id="echelontool-display-role"
              checked={!newPreferences.formationDisplay.defaultNoDisplayRole}
              onCheckedChange={(checked) =>
                setPreference(
                  "formationDisplay",
                  "defaultNoDisplayRole",
                  !checked,
                )
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <Label htmlFor="echelontool-vertical-groups">
              Default vertical groups
            </Label>

            <Switch
              id="echelontool-vertical-groups"
              checked={newPreferences.formationDisplay.defaultGroupsVertical}
              onCheckedChange={(checked) =>
                setPreference(
                  "formationDisplay",
                  "defaultGroupsVertical",
                  checked,
                )
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      <Button
        className="self-end"
        onClick={handleSaveClick}
        disabled={preferencesSaving}
      >
        Save Preferences
      </Button>
    </div>
  );
}
