"use client";

import { useState } from "react";

export function useImagePreview() {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  return { preview, setPreview, fileInfo, setFileInfo };
}
