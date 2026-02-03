'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardItem {
  competitor_id: number;
  competitor_name: string;
  competitor_type: string;
  url_id: number;
  url: string;
  url_name: string | null;
  source_type: string;
  last_checked: string | null;
  last_update_url: string | null;
  last_update_date: string | null;
  last_summary: string | null;
  status: string;
}

interface CompetitorGroup {
  id: number;
  name: string;
  type: string;
  items: DashboardItem[];
}

interface User {
  id: number;
  email: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorGroup | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return null;
      }
      const data = await res.json();
      setUser(data.user);
      return data.user;
    } catch {
      router.push('/login');
      return null;
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/competitors');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const items = await res.json();
      setData(Array.isArray(items) ? items : []);
    } catch {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth().then(user => {
      if (user) fetchData();
    });
  }, [checkAuth, fetchData]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleRefresh = async (urlId?: number) => {
    setRefreshing(true);
    try {
      await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urlId ? { urlId } : {}),
      });
      await fetchData();
    } catch {
      console.error('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (competitorId: number) => {
    if (!confirm('Delete this competitor?')) return;
    try {
      await fetch(`/api/competitors?id=${competitorId}`, { method: 'DELETE' });
      await fetchData();
    } catch {
      console.error('Failed to delete');
    }
  };

  // Group by competitor
  const grouped: CompetitorGroup[] = [];
  const seen = new Set<number>();

  for (const item of data) {
    if (!seen.has(item.competitor_id)) {
      seen.add(item.competitor_id);
      grouped.push({
        id: item.competitor_id,
        name: item.competitor_name,
        type: item.competitor_type,
        items: data.filter(d => d.competitor_id === item.competitor_id && d.url_id),
      });
    }
  }

  if (loading) {
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
            <Link href="/" className="text-xl font-semibold text-zinc-900 hover:text-zinc-700">
              Competitor Watch
            </Link>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              Demo
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-zinc-500 hover:text-zinc-700"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Add links to blogs or news pages to monitor for updates.
              For Facebook or LinkedIn pages, convert them to RSS feeds using{' '}
              <a href="https://rss.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">
                rss.app
              </a>{' '}
              or similar services, then add the feed URL here. Give each link a name so you can identify it easily.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleRefresh()}
              disabled={refreshing}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              {refreshing ? 'Checking...' : 'Refresh All'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Add Competitor
            </button>
          </div>

          {/* Add Form Modal */}
          {showAddForm && (
            <AddCompetitorForm
              onClose={() => setShowAddForm(false)}
              onSuccess={() => {
                setShowAddForm(false);
                fetchData();
              }}
            />
          )}

          {/* Edit Form Modal */}
          {editingCompetitor && (
            <EditCompetitorForm
              competitor={editingCompetitor}
              onClose={() => setEditingCompetitor(null)}
              onSuccess={() => {
                setEditingCompetitor(null);
                fetchData();
              }}
            />
          )}

          {/* Content */}
          {grouped.length === 0 ? (
            <EmptyState onAdd={() => setShowAddForm(true)} />
          ) : (
            <div className="space-y-6">
              {grouped.map(competitor => (
                <CompetitorCard
                  key={competitor.id}
                  competitor={competitor}
                  onRefresh={handleRefresh}
                  onDelete={handleDelete}
                  onEdit={setEditingCompetitor}
                  refreshing={refreshing}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <p className="text-sm text-zinc-500">Competitor Watch Demo</p>
          <a
            href="https://ycprojects.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            ycprojects.vercel.app
          </a>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
      <div className="text-zinc-400 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-zinc-900 mb-2">No competitors yet</h3>
      <p className="text-zinc-500 mb-6">Add your first competitor to start monitoring</p>
      <button
        onClick={onAdd}
        className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        Add Competitor
      </button>
    </div>
  );
}

function CompetitorCard({
  competitor,
  onRefresh,
  onDelete,
  onEdit,
  refreshing,
}: {
  competitor: CompetitorGroup;
  onRefresh: (urlId: number) => void;
  onDelete: (id: number) => void;
  onEdit: (competitor: CompetitorGroup) => void;
  refreshing: boolean;
}) {
  const typeColors = {
    competitor: 'bg-red-50 text-red-700',
    partner: 'bg-blue-50 text-blue-700',
    inspiration: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-zinc-900">{competitor.name}</h2>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[competitor.type as keyof typeof typeColors]}`}>
            {competitor.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(competitor)}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
            title="Edit competitor"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(competitor.id)}
            className="text-zinc-400 hover:text-red-500 transition-colors"
            title="Delete competitor"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* URLs */}
      {competitor.items.length === 0 ? (
        <div className="px-5 py-4 text-zinc-500 text-sm">No URLs added</div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {competitor.items.map(item => (
            <UrlRow key={item.url_id} item={item} onRefresh={onRefresh} refreshing={refreshing} />
          ))}
        </div>
      )}
    </div>
  );
}

function UrlRow({
  item,
  onRefresh,
  refreshing,
}: {
  item: DashboardItem;
  onRefresh: (urlId: number) => void;
  refreshing: boolean;
}) {
  const sourceIcons = {
    facebook: '📘',
    linkedin: '💼',
    website: '🌐',
  };

  const statusColors = {
    new_update: 'bg-green-100 text-green-800',
    no_updates: 'bg-zinc-100 text-zinc-600',
    error: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  const statusLabels = {
    new_update: 'New update',
    no_updates: 'No updates',
    error: 'Error',
    pending: 'Pending',
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatUpdateDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span>{sourceIcons[item.source_type as keyof typeof sourceIcons]}</span>
            <span className="text-sm font-medium text-zinc-700">
              {item.url_name || item.source_type.charAt(0).toUpperCase() + item.source_type.slice(1)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[item.status as keyof typeof statusColors]}`}>
              {statusLabels[item.status as keyof typeof statusLabels]}
            </span>
            {item.last_update_date && item.status === 'new_update' && (
              <span className="text-xs text-zinc-400">
                ({formatUpdateDate(item.last_update_date)})
              </span>
            )}
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-700 truncate block"
          >
            {item.url}
          </a>
          {item.last_summary && (
            <p className="mt-2 text-sm text-zinc-600">{item.last_summary}</p>
          )}
          {item.last_update_url && item.last_update_url !== item.url && (
            <a
              href={item.last_update_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-xs text-blue-600 hover:underline inline-block"
            >
              View latest content
            </a>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-zinc-400 mb-2">
            Checked: {formatDate(item.last_checked)}
          </div>
          <button
            onClick={() => onRefresh(item.url_id)}
            disabled={refreshing}
            className="text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
          >
            Check now
          </button>
        </div>
      </div>
    </div>
  );
}

interface UrlField {
  url: string;
  name: string;
}

function AddCompetitorForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'competitor' | 'partner' | 'inspiration'>('competitor');
  const [urls, setUrls] = useState<UrlField[]>([{ url: '', name: '' }]);
  const [saving, setSaving] = useState(false);

  const addUrlField = () => setUrls([...urls, { url: '', name: '' }]);
  const updateUrl = (index: number, field: 'url' | 'name', value: string) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setUrls(newUrls);
  };
  const removeUrl = (index: number) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validUrls = urls.filter(u => u.url.trim());
    if (validUrls.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, urls: validUrls }),
      });
      if (res.ok) {
        onSuccess();
      }
    } catch {
      console.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-medium text-zinc-900">Add Competitor</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            >
              <option value="competitor">Competitor</option>
              <option value="partner">Partner</option>
              <option value="inspiration">Inspiration</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">URLs</label>
            <p className="text-xs text-zinc-500 mb-2">Add blog/news URLs or RSS feeds. Give each a name to identify it (e.g. "Facebook Feed", "Company Blog").</p>
            <div className="space-y-3">
              {urls.map((urlItem, index) => (
                <div key={index} className="p-3 bg-zinc-50 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={urlItem.name}
                      onChange={e => updateUrl(index, 'name', e.target.value)}
                      placeholder="Name (e.g. Facebook Feed, Blog)"
                      className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm"
                    />
                    {urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUrl(index)}
                        className="px-2 text-zinc-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={urlItem.url}
                    onChange={e => updateUrl(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm"
                  />
                </div>
              ))}
            </div>
            {urls.length < 5 && (
              <button
                type="button"
                onClick={addUrlField}
                className="mt-2 text-sm text-zinc-500 hover:text-zinc-700"
              >
                + Add another URL
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditUrlField {
  id?: number;
  url: string;
  name: string;
  action?: 'update' | 'add' | 'delete';
  isNew?: boolean;
}

function EditCompetitorForm({
  competitor,
  onClose,
  onSuccess,
}: {
  competitor: CompetitorGroup;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(competitor.name);
  const [type, setType] = useState<'competitor' | 'partner' | 'inspiration'>(
    competitor.type as 'competitor' | 'partner' | 'inspiration'
  );
  const [urls, setUrls] = useState<EditUrlField[]>(
    competitor.items.length > 0
      ? competitor.items.map(item => ({
          id: item.url_id,
          url: item.url,
          name: item.url_name || '',
          action: 'update' as const,
        }))
      : [{ url: '', name: '', isNew: true, action: 'add' as const }]
  );
  const [saving, setSaving] = useState(false);

  const addUrlField = () => setUrls([...urls, { url: '', name: '', isNew: true, action: 'add' }]);

  const updateUrl = (index: number, field: 'url' | 'name', value: string) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    if (!newUrls[index].isNew) {
      newUrls[index].action = 'update';
    }
    setUrls(newUrls);
  };

  const removeUrl = (index: number) => {
    const urlItem = urls[index];
    if (urlItem.isNew) {
      // Just remove new unsaved URLs
      setUrls(urls.filter((_, i) => i !== index));
    } else {
      // Mark existing URLs for deletion
      const newUrls = [...urls];
      newUrls[index] = { ...newUrls[index], action: 'delete' };
      setUrls(newUrls);
    }
  };

  const restoreUrl = (index: number) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], action: 'update' };
    setUrls(newUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      // Prepare URL updates
      const urlUpdates = urls
        .filter(u => u.action === 'delete' || (u.url.trim() && (u.action === 'add' || u.action === 'update')))
        .map(u => ({
          id: u.id,
          url: u.url,
          name: u.name || null,
          action: u.action,
        }));

      const res = await fetch('/api/competitors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: competitor.id,
          name,
          type,
          urls: urlUpdates,
        }),
      });

      if (res.ok) {
        onSuccess();
      }
    } catch {
      console.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const activeUrls = urls.filter(u => u.action !== 'delete');
  const deletedUrls = urls.filter(u => u.action === 'delete');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-medium text-zinc-900">Edit Competitor</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            >
              <option value="competitor">Competitor</option>
              <option value="partner">Partner</option>
              <option value="inspiration">Inspiration</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">URLs</label>
            <p className="text-xs text-zinc-500 mb-2">Edit, add, or remove URLs. Give each a name to identify it.</p>
            <div className="space-y-3">
              {urls.map((urlItem, index) => (
                urlItem.action !== 'delete' && (
                  <div key={urlItem.id || `new-${index}`} className="p-3 bg-zinc-50 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={urlItem.name}
                        onChange={e => updateUrl(index, 'name', e.target.value)}
                        placeholder="Name (e.g. Facebook Feed, Blog)"
                        className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeUrl(index)}
                        className="px-2 text-zinc-400 hover:text-red-500"
                        title="Remove URL"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="url"
                      value={urlItem.url}
                      onChange={e => updateUrl(index, 'url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm"
                    />
                  </div>
                )
              ))}
            </div>

            {/* Show deleted URLs with restore option */}
            {deletedUrls.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">Will be deleted:</p>
                {deletedUrls.map((urlItem) => {
                  const originalIndex = urls.findIndex(u => u.id === urlItem.id);
                  return (
                    <div key={urlItem.id} className="p-2 bg-red-50 rounded-lg flex items-center justify-between">
                      <span className="text-sm text-red-700 line-through truncate">
                        {urlItem.name || urlItem.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => restoreUrl(originalIndex)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Restore
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {activeUrls.length < 5 && (
              <button
                type="button"
                onClick={addUrlField}
                className="mt-2 text-sm text-zinc-500 hover:text-zinc-700"
              >
                + Add another URL
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
