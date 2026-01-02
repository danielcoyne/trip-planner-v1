import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trip Planner - Audrey's Dashboard",
  description: "Collaborative trip planning for travel agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <h1 className="text-xl font-bold">Trip Planner</h1>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}