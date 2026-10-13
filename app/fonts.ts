import { Geist, Geist_Mono, Roboto } from "next/font/google";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The form's typeface. Also applied to the form preview itself, so Export PDF (which prints
// the preview in a separate frame without the page's <body> classes) keeps the same font.
export const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});
