declare module "apca-w3" {
  export function APCAcontrast(textY: number, bgY: number): number | string;
  export function sRGBtoY(rgb: number[]): number;
}
