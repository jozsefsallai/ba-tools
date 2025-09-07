"use client";

import { Plana } from "@/components/plana";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PlanaExpression } from "@/lib/plana";
import { useState } from "react";
import { toast } from "sonner";

export function PlanaView() {
  const [planaExpression, setPlanaExpression] =
    useState<PlanaExpression>("idle");

  const [requestInProgress, setRequestInProgress] = useState(false);

  const [input, setInput] = useState("");

  const [userInput, setUserInput] = useState("");
  const [planaResponse, setPlanaResponse] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (requestInProgress || !input.trim()) {
      return;
    }

    setRequestInProgress(true);
    setPlanaExpression("thinking");

    try {
      const response = await fetch("/api/plana-ai/get-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from Plana AI");
      }

      setInput("");

      const data = await response.json();
      setUserInput(data.input);
      setPlanaResponse(data.response.message);
      setPlanaExpression(data.response.expression ?? "idle");
    } catch (err) {
      toast.error("Failed to get response from Plana AI");
      console.error(err);
      setPlanaExpression("sad");
    } finally {
      setRequestInProgress(false);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full items-end">
      <div className="translate-y-10">
        <Plana expression={planaExpression} inline />
      </div>

      <div className="col-span-2 flex flex-col gap-4">
        {!requestInProgress && userInput.length > 0 && (
          <div className="p-4 border-2 rounded-md">
            <h2 className="text-lg font-semibold">You:</h2>
            <p>{userInput}</p>
          </div>
        )}

        {!requestInProgress && planaResponse.length > 0 && (
          <div className="p-4 border-2 bg-border rounded-md">
            <h2 className="text-lg font-semibold">Plana:</h2>
            <p>{planaResponse}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to Plana..."
            rows={3}
            className="resize-none"
            disabled={requestInProgress}
          />
          <Button type="submit" disabled={requestInProgress}>
            {requestInProgress ? "Thinking..." : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}
