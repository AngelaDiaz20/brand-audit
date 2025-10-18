"use client";

import { useState } from "react";

export function useImagePreview() {
  const [preview, setPreview] = useState<string | null>(null);
  return { preview, setPreview };
}
