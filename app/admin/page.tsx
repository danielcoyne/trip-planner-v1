import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin - Users</h1>
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {users.length} user{users.length !== 1 ? 's' : ''} with access
          </p>
        </div>

        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="px-4 py-4 flex items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name || 'No name'}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>

              <div className="text-xs text-gray-400">
                Joined {user.createdAt.toLocaleDateString()}
              </div>
            </li>
          ))}

          {users.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No users yet. Sign in to be the first!
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
