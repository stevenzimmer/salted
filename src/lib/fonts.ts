import { Barlow_Condensed, Lora } from "next/font/google";

export const editorialFont = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-editorial",
});

// Licensed Balgin files are intentionally not bundled. Replace only this export
// with next/font/local when the client supplies the licensed .woff2 files.
export const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});
