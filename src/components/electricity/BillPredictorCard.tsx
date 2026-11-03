'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  TrendingDown,
  Home,
  Users,
  Tv,
  Wind,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface PredictionData {
  predictedBillRupees: number;
  predictedKwh: number;
  breakdown: {
    baseFixed: number;
    airConditioning: number;
    appliancesAndTv: number;
    occupancyLoad: number;
    urbanDensityFactor: number;
    areaFactor: number;
  };
  seasonalAdjustment: {
    season: 'summer' | 'monsoon' | 'winter';
    multiplier: number;
    adjustedBillRupees: number;
    adjustedKwh: number;
  };
  efficiencyChallenge: {
    target10PercentKwh: number;
    potentialSavingsRupees: number;
    greenRewardBonusPoints?: number;
  };
  recommendations: Array<{
    title: string;
    impactRupees: number;
    category: string;
  }>;
  modelAccuracy: {
    r2Score: number;
    mae: number;
    algorithm: string;
    trainingSampleSize: number;
  };
}

export default function BillPredictorCard() {
  const [housearea, setHousearea] = useState(750);
  const [numPeople, setNumPeople] = useState(4);
  const [numRooms, setNumRooms] = useState(2);
  const [numChildren, setNumChildren] = useState(1);
  const [isAc, setIsAc] = useState(true);
  const [isTv, setIsTv] = useState(true);
  const [isFlat, setIsFlat] = useState(true);
  const [income, setIncome] = useState(28000);
  const [season, setSeason] = useState<'summer' | 'monsoon' | 'winter'>('summer');

  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPrediction();
  }, [housearea, numPeople, numRooms, numChildren, isAc, isTv, isFlat, income, season]);

  async function fetchPrediction() {
    setLoading(true);
    try {
      const res = await fetch('/api/electricity/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          housearea,
          num_people: numPeople,
          num_rooms: numRooms,
          num_children: numChildren,
          is_ac: isAc,
          is_tv: isTv,
          is_flat: isFlat,
          ave_monthly_income: income,
          is_urban: true,
          season,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrediction(data.prediction);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 font-body">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Trained ML Model · 1,000 Household Records · R² 88.5%</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            AI Electricity Bill &amp; Usage Predictor
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Adjust household parameters to see predicted power consumption (kWh) and bill amount (₹) with custom energy-saving recommendations.
          </p>
        </div>

        {prediction && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-right shrink-0">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
              Predicted Bill
            </span>
            <div className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
              ₹{prediction.predictedBillRupees.toFixed(0)}
            </div>
            <span className="text-xs font-semibold text-emerald-700 block mt-0.5">
              ~{prediction.predictedKwh} kWh/month
            </span>
          </div>
        )}
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80">
        {/* House Area */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex justify-between">
            <span>Area (sq ft)</span>
            <span className="font-mono text-emerald-800">{housearea} sq ft</span>
          </label>
          <input
            type="range"
            min={300}
            max={2200}
            step={25}
            value={housearea}
            onChange={(e) => setHousearea(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Number of People */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex justify-between">
            <span>Household Members</span>
            <span className="font-mono text-emerald-800">{numPeople} people</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={numPeople}
            onChange={(e) => setNumPeople(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Number of Rooms */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex justify-between">
            <span>Number of Rooms</span>
            <span className="font-mono text-emerald-800">{numRooms} rooms</span>
          </label>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={numRooms}
            onChange={(e) => setNumRooms(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Number of Children */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex justify-between">
            <span>Children</span>
            <span className="font-mono text-emerald-800">{numChildren} kids</span>
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={numChildren}
            onChange={(e) => setNumChildren(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Toggle Toggles */}
        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Wind className="w-4 h-4 text-cyan-600" />
            <span>Air Conditioning</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAc(!isAc)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
              isAc
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isAc ? 'YES' : 'NO'}
          </button>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Tv className="w-4 h-4 text-purple-600" />
            <span>Television / Media</span>
          </div>
          <button
            type="button"
            onClick={() => setIsTv(!isTv)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
              isTv
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isTv ? 'YES' : 'NO'}
          </button>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Home className="w-4 h-4 text-amber-600" />
            <span>Flat vs House</span>
          </div>
          <button
            type="button"
            onClick={() => setIsFlat(!isFlat)}
            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            {isFlat ? 'Apartment' : 'Individual'}
          </button>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>☀️ Season</span>
          </div>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as any)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="summer">Summer (Peak AC)</option>
            <option value="monsoon">Monsoon</option>
            <option value="winter">Winter (Cool)</option>
          </select>
        </div>
      </div>

      {/* Predictions Detail */}
      {prediction && (
        <div className="space-y-6">
          {/* Target 10% Reduction Opportunity Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                10% Reduction Reward Goal
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                Target Monthly Cap: {prediction.efficiencyChallenge.target10PercentKwh} kWh
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                Reduce your bill to below ₹{(prediction.predictedBillRupees * 0.9).toFixed(0)} to claim a {prediction.efficiencyChallenge.greenRewardBonusPoints || 150} Green Points bonus!
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs text-center shrink-0 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 block">Bill Savings &amp; Points</span>
              <span className="font-display text-2xl font-bold text-emerald-700 block mt-0.5">
                ₹{prediction.efficiencyChallenge.potentialSavingsRupees.toFixed(0)} + {prediction.efficiencyChallenge.greenRewardBonusPoints || 150} GP
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Bill Savings + 150 GP Challenge</span>
            </div>
          </div>

          {/* Load Breakdown Bars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Component Load Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Base Grid Load</span>
                <span className="font-display text-xl font-bold text-slate-800 block mt-1">
                  ₹{prediction.breakdown.baseFixed}
                </span>
              </div>
              <div className="bg-cyan-50/60 p-3 rounded-xl border border-cyan-200">
                <span className="text-[11px] text-cyan-800 font-semibold block">Air Conditioning</span>
                <span className="font-display text-xl font-bold text-cyan-900 block mt-1">
                  ₹{prediction.breakdown.airConditioning}
                </span>
              </div>
              <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200">
                <span className="text-[11px] text-purple-800 font-semibold block">TV &amp; Electronics</span>
                <span className="font-display text-xl font-bold text-purple-900 block mt-1">
                  ₹{prediction.breakdown.appliancesAndTv}
                </span>
              </div>
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <span className="text-[11px] text-amber-800 font-semibold block">Family &amp; Kids</span>
                <span className="font-display text-xl font-bold text-amber-900 block mt-1">
                  ₹{prediction.breakdown.occupancyLoad}
                </span>
              </div>
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                <span className="text-[11px] text-blue-800 font-semibold block">Urban Grid Factor</span>
                <span className="font-display text-xl font-bold text-blue-900 block mt-1">
                  ₹{prediction.breakdown.urbanDensityFactor}
                </span>
              </div>
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-800 font-semibold block">Floor Area Factor</span>
                <span className="font-display text-xl font-bold text-emerald-900 block mt-1">
                  ₹{prediction.breakdown.areaFactor}
                </span>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Smart Energy Efficiency Tips
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prediction.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">{rec.title}</p>
                      <span className="text-[10px] text-slate-400">{rec.category}</span>
                    </div>
                  </div>
                  <span className="font-display text-sm font-bold text-emerald-700 shrink-0">
                    +₹{rec.impactRupees}/mo
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
