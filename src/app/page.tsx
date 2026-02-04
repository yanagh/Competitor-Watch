'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          router.push('/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900">Competitor Watch</h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              Demo
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-semibold text-zinc-900 mb-4">
              Monitor your competitors without the manual work
            </h2>
            <p className="text-lg text-zinc-600 mb-8">
              Add links to competitor blogs and news pages. Get notified when they post updates.
              No more checking websites manually or asking "did they post anything?"
            </p>

            {/* How it works */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8">
              <h3 className="font-medium text-zinc-900 mb-4">How it works</h3>
              <ol className="space-y-3 text-sm text-zinc-600">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-medium text-zinc-700">1</span>
                  <span>Add competitor names and their blog/news page URLs</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-medium text-zinc-700">2</span>
                  <span>For Facebook or LinkedIn pages, convert them to RSS feeds using <a href="https://rss.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">rss.app</a> or similar services</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-medium text-zinc-700">3</span>
                  <span>Check your dashboard to see all updates in one place</span>
                </li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Link
                href="/register"
                className="px-6 py-3 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Start Monitoring
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <p className="text-sm text-zinc-500">Competitor Watch Demo</p>
          <a
            href="https://www.yanaintech.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Built by yanaintech.com
          </a>
        </div>
      </footer>
    </div>
  );
}
