import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Project Unknown - Hyperlocal Skilled Services Marketplace",
  description:
    "Find trusted local skilled workers powered by AI requirement extraction and deterministic PostGIS matching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
