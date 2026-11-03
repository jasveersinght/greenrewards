'use client';

import React, { useState } from 'react';

interface CommuteReviewCardProps {
  ticket: {
    id: string;
    ticketId: string;
    journeyDate: Date | string;
    imageUrl: string;
    user: {
      displayName: string | null;
      email: string;
    };
    challenge: {
      id: string;
      targetJourneys: number;
    };
  };
}

export default function CommuteReviewCard({ ticket }: CommuteReviewCardProps) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(action: 'APPROVED' | 'REJECTED') {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/commute/tickets/${ticket.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review ticket');
      setDecision(action);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (decision) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs font-body">
        <span className="font-mono text-slate-800 font-bold">{ticket.ticketId}</span>
        <span
          className={`px-2.5 py-1 rounded-full font-bold ${
            decision === 'APPROVED'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {decision === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs font-body">
      {error && (
        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-start gap-3">
        {ticket.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ticket.imageUrl}
            alt="Ticket proof"
            className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-purple-200 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 font-mono tracking-wider">{ticket.ticketId}</span>
            <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
              Public Transit
            </span>
          </div>
          <p className="text-slate-600 mt-1">
            Date: {new Date(ticket.journeyDate).toLocaleDateString()}
          </p>
          <p className="text-slate-400 text-[10px] mt-0.5">
            By {ticket.user.displayName || ticket.user.email}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleReview('REJECTED')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition cursor-pointer"
        >
          Reject ✕
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleReview('APPROVED')}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
        >
          Approve Journey ✓
        </button>
      </div>
    </div>
  );
}
