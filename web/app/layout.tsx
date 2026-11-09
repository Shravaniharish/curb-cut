import type { Metadata, Viewport } from "next";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/opendyslexic/400.css";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "Curb Cut", template: "%s · Curb Cut" },
  description: "Find the right talk, get there, and know what to do when plans change.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch zoom stays enabled for accessibility.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-font="default" data-motion="system">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
