import { useEffect, useState } from 'react';

interface TrackingData {
  summary: { total_sends: number; unique_recipients: number };
  byType: { message_type: string; count: number }[];
  rates: {
    message_type: string;
    sends: number;
    opens: number;
    clicked_sends: number;
    total_clicks: number;
  }[];
  recentSends: {
    id: string;
    email: string;
    message_type: string;
    subject: string;
    sent_at: string;
    opens: number;
    clicks: number;
  }[];
  topLinks: { link_label: string; link_url: string; clicks: number }[];
}

type Status = 'loading' | 'ok' | 'unauthorized' | 'forbidden' | 'error';

export function AdminTracking() {
  const [data, setData] = useState<TrackingData | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    fetch('/api/admin/tracking', { credentials: 'include' })
      .then(res => {
        if (res.status === 401) { setStatus('unauthorized'); return null; }
        if (res.status === 403) { setStatus('forbidden'); return null; }
        if (!res.ok) { setStatus('error'); return null; }
        return res.json();
      })
      .then(json => {
        if (json) { setData(json); setStatus('ok'); }
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="text-center py-20 text-slate-400">Loading tracking data...</div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-2">Not Authenticated</h1>
        <p className="text-slate-400">Please sign in with GitHub to access this page.</p>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400">Your account does not have admin access.</p>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
        <p className="text-slate-400">Failed to load tracking data.</p>
      </div>
    );
  }

  // Compute overall rates from the rates data
  const totals = data.rates.reduce(
    (acc, r) => ({
      sends: acc.sends + r.sends,
      opens: acc.opens + r.opens,
      clickedSends: acc.clickedSends + r.clicked_sends,
    }),
    { sends: 0, opens: 0, clickedSends: 0 }
  );
  const overallOpenRate = totals.sends > 0 ? ((totals.opens / totals.sends) * 100).toFixed(1) : '0';
  const overallClickRate = totals.sends > 0 ? ((totals.clickedSends / totals.sends) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Email Tracking</h1>
      <p className="text-slate-400 mb-8 text-sm">Last 30 days unless noted</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <SummaryCard label="Total Sends" value={data.summary.total_sends} />
        <SummaryCard label="Unique Recipients" value={data.summary.unique_recipients} />
        <SummaryCard label="Open Rate (30d)" value={`${overallOpenRate}%`} />
        <SummaryCard label="Click Rate (30d)" value={`${overallClickRate}%`} />
      </div>

      {/* Rates by message type */}
      {data.rates.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-3">By Message Type</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4 text-right">Sends</th>
                  <th className="py-2 pr-4 text-right">Opens</th>
                  <th className="py-2 pr-4 text-right">Open %</th>
                  <th className="py-2 pr-4 text-right">Clicks</th>
                  <th className="py-2 text-right">Click %</th>
                </tr>
              </thead>
              <tbody>
                {data.rates.map(r => (
                  <tr key={r.message_type} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-amber-500">{r.message_type}</td>
                    <td className="py-2 pr-4 text-right">{r.sends}</td>
                    <td className="py-2 pr-4 text-right">{r.opens}</td>
                    <td className="py-2 pr-4 text-right">
                      {r.sends > 0 ? ((r.opens / r.sends) * 100).toFixed(1) : '0'}%
                    </td>
                    <td className="py-2 pr-4 text-right">{r.total_clicks}</td>
                    <td className="py-2 text-right">
                      {r.sends > 0 ? ((r.clicked_sends / r.sends) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top clicked links */}
      {data.topLinks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-3">Top Clicked Links</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">URL</th>
                  <th className="py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {data.topLinks.map((link, i) => (
                  <tr key={i} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4">{link.link_label || '-'}</td>
                    <td className="py-2 pr-4 truncate max-w-xs" title={link.link_url}>
                      {link.link_url}
                    </td>
                    <td className="py-2 text-right font-medium text-amber-500">{link.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent sends */}
      {data.recentSends.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Recent Sends</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Sent</th>
                  <th className="py-2 pr-4 text-right">Opens</th>
                  <th className="py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSends.map(send => (
                  <tr key={send.id} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4 truncate max-w-[140px]" title={send.email}>
                      {send.email}
                    </td>
                    <td className="py-2 pr-4 text-amber-500">{send.message_type}</td>
                    <td className="py-2 pr-4 truncate max-w-[200px]" title={send.subject}>
                      {send.subject}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(send.sent_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {send.opens > 0 ? (
                        <span className="text-green-400">{send.opens}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {send.clicks > 0 ? (
                        <span className="text-green-400">{send.clicks}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="text-2xl font-bold text-amber-500">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
