"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";


export function InteractiveDemo(): React.JSX.Element {
  const [clickCount, setClickCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [textVal, setTextVal] = useState("Hello NOlida");
  const [areaVal, setAreaVal] = useState("Exploring the design primitives...");

  const handleSimulateLoad = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        maxWidth: "600px",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
        <Button onClick={() => setClickCount((c) => c + 1)}>
          Clicked {clickCount} times
        </Button>
        <Button
          variant="secondary"
          loading={isLoading}
          onClick={handleSimulateLoad}
        >
          {isLoading ? "Loading..." : "Test 2s Loader"}
        </Button>
      </div>

      <Input
        label="Live Reactive Input"
        value={textVal}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTextVal(e.target.value)}
        hint={`Current length: ${textVal.length} characters`}
      />

      <Textarea
        label="Live Reactive Textarea"
        value={areaVal}
        rows={3}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAreaVal(e.target.value)}
      />
    </div>
  );
}

