import { useState } from "react";

interface FileInfo {
  name: string;
  size: string; // ✅ antes probablemente era number
}

export function useImagePreview() {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  return { preview, setPreview, fileInfo, setFileInfo };
}
