'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, ArrowLeft, Heart, Package, Clock, Sparkles, Tag, CheckCircle2 } from 'lucide-react';

interface FoodListing {
  id: string;
  type: 'SALE' | 'DONATION';
  item: string;
  quantity: number;
  reserved: number;
  remaining: number;
  originalPricePaise?: number | null;
  discountedPricePaise?: number | null;
  pickupStart?: string | null;
  pickupEnd?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  consumeBy?: string | null;
  handlingNeeds?: string | null;
  savings: {
    discountPaise: number;
    discountPercent: number;
  };
  partner: {
    id: string;
    name: string;
    isSimulated: boolean;
  };
}

interface Reservation {
  id: string;
  quantity: number;
  pickupCode: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  listing: {
    item: string;
    discountedPricePaise?: number | null;
    partner: {
      name: string;
    };
  };
}

interface DonationParcel {
  id: string;
  parcelCode: string;
  quantity: number;
  status: string;
  partner: {
    name: string;
  };
  listing: {
    item: string;
    handlingNeeds?: string | null;
  };
  mission?: {
    id: string;
    volunteerId: string;
    completedAt?: string | null;
    volunteer: {
      name?: string | null;
      email: string;
    };
  } | null;
}

export default function FoodPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'SALE' | 'DONATION' | 'MY_RESERVATIONS'>('SALE');
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [parcels, setParcels] = useState<DonationParcel[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'SALE') {
        const res = await fetch('/api/food/listings?type=SALE');
        const data = await res.json();
        if (data.success) setListings(data.listings);
      } else if (activeTab === 'DONATION') {
        const res = await fetch('/api/food/parcels');
        const data = await res.json();
        if (data.success) setParcels(data.parcels);
      } else {
        const res = await fetch('/api/food/reservations');
        const data = await res.json();
        if (data.success) setReservations(data.reservations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimMission(parcelId: string) {
    try {
      const res = await fetch('/api/food/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim mission');
      setActionMsg('🎉 Mission claimed! Head to the partner kitchen to collect parcel.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCompleteMission(missionId: string) {
    try {
      const res = await fetch(`/api/food/missions/${missionId}/complete`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete mission');
      setActionMsg('🌟 Parcel delivered! ₹50 volunteer bounty credited to your wallet.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCancelReservation(reservationId: string) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      const res = await fetch(`/api/food/reservations/${reservationId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel reservation');
      setActionMsg('Reservation cancelled and meal stock restored.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-8 font-body">
      {/* Header */}
      <div>
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Challenges</span>
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-200 mb-2">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Zero Food Waste Chennai</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Food Rescue
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Save surplus quality meals at deep discounts or volunteer to dispatch community parcels.
            </p>
          </div>

          <Link
            href="/merchant"
            className="hidden sm:inline-flex items-center text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            Partner Kitchen Hub →
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-sm flex justify-between items-center shadow-xs">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('SALE')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'SALE'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>🍱 Discount Meals</span>
        </button>
        <button
          onClick={() => setActiveTab('DONATION')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'DONATION'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>🤝 Community Parcels</span>
        </button>
        <button
          onClick={() => setActiveTab('MY_RESERVATIONS')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'MY_RESERVATIONS'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>🎟️ My Pickups</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm animate-pulse">
            Loading food rescue listings...
          </div>
        ) : activeTab === 'SALE' ? (
          listings.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <p className="text-4xl mb-3">🍽️</p>
              <h3 className="font-semibold text-slate-900 text-base">No active surplus meals right now</h3>
              <p className="text-xs text-slate-500 mt-1">Check back later in the evening as cafes update stock!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all shadow-xs"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-slate-900 text-lg">{item.item}</h3>
                          {item.savings.discountPercent > 0 && (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {item.savings.discountPercent}% OFF
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>🏪 {item.partner.name}</span>
                          {item.partner.isSimulated && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                              Simulated
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-emerald-700 font-bold text-lg font-display">
                          ₹{((item.discountedPricePaise || 0) / 100).toFixed(0)}
                        </div>
                        {item.originalPricePaise && (
                          <div className="text-xs text-slate-400 line-through">
                            ₹{(item.originalPricePaise / 100).toFixed(0)}
                          </div>
                        )}
                      </div>
                    </div>

                    {item.ingredients && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                        Ingredients: {item.ingredients}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-600">
                      <span className="bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-slate-700">
                        📦 {item.remaining} left
                      </span>
                      {item.allergens && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                          🌱 {item.allergens}
                        </span>
                      )}
                      {item.pickupEnd && (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                          ⏰ Until {new Date(item.pickupEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">UPI / Cash on pickup</span>
                    <Link
                      href={`/food/reserve/${item.id}`}
                      className={`text-xs px-4 py-2 rounded-xl font-semibold transition ${
                        item.remaining > 0
                          ? 'bg-emerald-700 text-white hover:bg-emerald-600 shadow-2xs'
                          : 'bg-slate-100 text-slate-400 pointer-events-none'
                      }`}
                    >
                      {item.remaining > 0 ? 'Reserve Meal →' : 'Sold Out'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'DONATION' ? (
          parcels.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <p className="text-4xl mb-3">🤝</p>
              <h3 className="font-semibold text-slate-900 text-base">No pending donation parcels</h3>
              <p className="text-xs text-slate-500 mt-1">All community food parcels have been dispatched!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {parcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-slate-900 text-lg">{parcel.listing.item}</h3>
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {parcel.quantity} MEALS
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Destination NGO: <span className="text-emerald-800 font-semibold">{parcel.partner.name}</span>
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          parcel.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : parcel.status === 'COLLECTED'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {parcel.status}
                      </span>
                    </div>

                    {parcel.listing.handlingNeeds && (
                      <p className="text-xs text-amber-800 mt-3 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        ⚠️ Handling: {parcel.listing.handlingNeeds}
                      </p>
                    )}

                    <div className="mt-3 text-xs text-slate-500">
                      Tracking Code: <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">{parcel.parcelCode}</code>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-emerald-800 font-bold">Bounty: ₹50 Wallet Credit</span>

                    {!parcel.mission ? (
                      <button
                        onClick={() => handleClaimMission(parcel.id)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold transition cursor-pointer"
                      >
                        Claim Delivery Mission
                      </button>
                    ) : !parcel.mission.completedAt ? (
                      <button
                        onClick={() => handleCompleteMission(parcel.mission!.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold transition cursor-pointer"
                      >
                        Mark Delivered ✓
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Delivered by {parcel.mission.volunteer.name || 'Volunteer'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          reservations.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <p className="text-4xl mb-3">🎟️</p>
              <h3 className="font-semibold text-slate-900 text-base">No active food pickups</h3>
              <p className="text-xs text-slate-500 mt-1">Reserve a meal from the Discount Meals tab to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-bold text-slate-900 text-lg">{res.listing.item}</h3>
                      <p className="text-xs text-emerald-800 font-semibold mt-0.5">Store: {res.listing.partner.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Quantity: {res.quantity} meal(s)</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        res.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : res.status === 'ACTIVE'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>

                  <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-mono">
                        Pickup Code
                      </span>
                      <span className="text-2xl font-mono font-bold text-slate-900 tracking-widest">
                        {res.pickupCode}
                      </span>
                    </div>

                    {res.status === 'ACTIVE' && (
                      <div className="text-right">
                        <span className="text-[10px] text-amber-700 block font-semibold">Valid until</span>
                        <span className="text-xs text-slate-700 font-mono font-medium">
                          {new Date(res.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {res.status === 'ACTIVE' && (
                    <div className="mt-4 pt-2 flex justify-end">
                      <button
                        onClick={() => handleCancelReservation(res.id)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold transition cursor-pointer"
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
