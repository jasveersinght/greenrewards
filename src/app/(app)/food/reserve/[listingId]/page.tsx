'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function FoodReservePage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const router = useRouter();

  const [listing, setListing] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadListing() {
      try {
        const res = await fetch(`/api/food/listings/${listingId}`);
        const data = await res.json();
        if (data.success) {
          setListing(data.listing);
        } else {
          setError(data.error || 'Failed to load listing');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadListing();
  }, [listingId]);

  async function handleConfirmReservation() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/food/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reserve food');
      setReservation(data.reservation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm font-body">
        Loading meal details...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="p-8 text-center font-body bg-white border border-slate-200/90 rounded-2xl max-w-md mx-auto shadow-xs">
        <p className="text-rose-600 mb-4 text-sm font-semibold">{error || 'Meal not found'}</p>
        <Link href="/food" className="text-emerald-700 text-sm font-semibold hover:underline">
          ← Back to Food Rescue
        </Link>
      </div>
    );
  }

  if (reservation) {
    return (
      <div className="max-w-lg mx-auto font-body space-y-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 border border-emerald-200 shadow-xs">
            🎉
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Meal Reserved!</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Show this 4-character pickup code to the merchant at the counter.
          </p>

          <div className="my-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              Pickup Code
            </span>
            <span className="font-display text-4xl sm:text-5xl font-bold text-emerald-800 tracking-widest mt-2 block font-mono">
              {reservation.pickupCode}
            </span>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Valid until {new Date(reservation.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="text-left bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Item:</span>
              <span className="text-slate-900 font-semibold">{listing.item}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Store:</span>
              <span className="text-emerald-800 font-semibold">{listing.partner.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quantity:</span>
              <span className="text-slate-900 font-semibold">{reservation.quantity} meal(s)</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <span className="text-slate-700">Total payable at counter:</span>
              <span className="font-display text-base font-bold text-emerald-800">
                ₹{(((listing.discountedPricePaise || 0) * reservation.quantity) / 100).toFixed(0)}
              </span>
            </div>
          </div>

          <Link
            href="/food"
            className="block w-full py-3.5 bg-emerald-700 text-white font-semibold rounded-xl hover:bg-emerald-600 transition shadow-sm text-sm"
          >
            Done &amp; View My Pickups →
          </Link>
        </div>
      </div>
    );
  }

  const remaining = listing.remaining ?? (listing.quantity - listing.reserved);
  const unitPrice = (listing.discountedPricePaise || 0) / 100;
  const totalPrice = unitPrice * quantity;

  return (
    <div className="max-w-xl mx-auto space-y-6 font-body pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/food"
          className="text-slate-500 hover:text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Meals</span>
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm sm:text-base font-display font-bold text-slate-900 truncate">
          Reserve Meal
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold shadow-xs">
          {error}
        </div>
      )}

      {/* Meal Info Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">{listing.item}</h2>
            <p className="text-xs font-semibold text-emerald-800 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{listing.partner.name}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-2xl font-bold text-slate-900">
              ₹{unitPrice.toFixed(0)}
            </div>
            {listing.originalPricePaise && (
              <div className="text-xs text-slate-400 line-through">
                ₹{(listing.originalPricePaise / 100).toFixed(0)}
              </div>
            )}
          </div>
        </div>

        {listing.ingredients && (
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700 block mb-0.5">Ingredients</span>
            {listing.ingredients}
          </div>
        )}

        {listing.allergens && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Dietary:</span>
            <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
              {listing.allergens}
            </span>
          </div>
        )}

        {listing.handlingNeeds && (
          <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
            ⚠️ <strong>Handling:</strong> {listing.handlingNeeds}
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
          <span>Remaining in stock:</span>
          <span className="font-semibold text-slate-900">{remaining} available</span>
        </div>
      </div>

      {/* Quantity selector */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Select Quantity
        </label>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
            >
              -
            </button>
            <span className="font-display text-xl font-bold text-slate-900 w-8 text-center">
              {quantity}
            </span>
            <button
              type="button"
              disabled={quantity >= remaining}
              onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
            >
              +
            </button>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Payable at Counter</span>
            <span className="font-display text-2xl font-bold text-emerald-800">
              ₹{totalPrice.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleConfirmReservation}
        disabled={submitting || remaining <= 0}
        className="w-full py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-2xl transition shadow-md disabled:opacity-50 text-sm cursor-pointer"
      >
        {submitting ? '⏳ Confirming Reservation...' : `Confirm & Reserve ${quantity} Meal(s) →`}
      </button>
    </div>
  );
}
