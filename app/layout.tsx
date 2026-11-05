import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Header from "@/components/Header";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Misread Score",
  description: "Flags how formatting can make accurate charts misleading.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Providers>
          <Header />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
