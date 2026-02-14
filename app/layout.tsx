import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { UserMenu } from '@/components/UserMenu';

export const metadata: Metadata = {
  title: "Trip Planner - Audrey's Dashboard",
  description: 'Collaborative trip planning for travel agents',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <SessionProvider>
          <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trip Planner</h1>
              <UserMenu />
            </div>
          </nav>
          <main className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
