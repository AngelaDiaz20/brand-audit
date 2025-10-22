declare module "get-image-colors" {
  interface ImageColor {
    hex: () => string;
    rgb: () => [number, number, number];
  }

  function getImageColors(
    source: string | Buffer,
    type?: { type?: string }
  ): Promise<ImageColor[]>;

  export = getImageColors;
}
