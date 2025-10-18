"use client";

interface ImagePreviewProps {
  src: string;
  alt?: string;
}

export default function ImagePreview({ src, alt }: ImagePreviewProps) {
  return (
    <div className="flex flex-col items-center">
      <img
        src={src}
        alt={alt || "Vista previa"}
        className="max-h-64 rounded-xl object-contain shadow-md"
      />
    </div>
  );
}
