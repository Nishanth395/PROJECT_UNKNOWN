"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { ServiceRequest, UrgencyLevel } from "@/types/service-request";
import { validateCoordinates, formatUrgency } from "@/lib/utils";
import { ErrorAlert } from "@/components/error-alert";
import {
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Sliders,
} from "lucide-react";

export default function CreateRequestPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel>("normal");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [addressText, setAddressText] = useState("");
  const [isManualLocationOpen, setIsManualLocationOpen] = useState(false);

  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter location manually.");
      setIsManualLocationOpen(true);
      return;
    }

    setIsDetectingGps(true);
    setLocationStatus(null);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        setLatitude(lat);
        setLongitude(lon);
        setLocationStatus(`Location detected ✓ (Lat: ${lat}, Lon: ${lon})`);
        setIsDetectingGps(false);
      },
      (err) => {
        setIsDetectingGps(false);
        setLocationStatus(null);
        setError(`Could not access device location (${err.message}). Please enter coordinates manually.`);
        setIsManualLocationOpen(true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const handleUseDemoLocation = () => {
    setLatitude("12.9500");
    setLongitude("77.6300");
    setAddressText("Indiranagar, Bengaluru");
    setLocationStatus("Location detected ✓ (Lat: 12.9500, Lon: 77.6300 — Bengaluru Demo)");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = description.trim();
    if (trimmed.length < 5) {
      setError("Problem description must be at least 5 characters long.");
      return;
    }

    if (trimmed.length > 2000) {
      setError("Problem description cannot exceed 2000 characters.");
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (!validateCoordinates(latNum, lonNum)) {
      setError("Please provide a valid service location (-90 ≤ latitude ≤ 90 and -180 ≤ longitude ≤ 180). Use 'Use my current location' or enter coordinates manually.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post<ServiceRequest>("/api/v1/service-requests", {
        description: trimmed,
        urgency,
        latitude: latNum,
        longitude: lonNum,
        address_text: addressText.trim() || undefined,
      });

      router.push(`/requests/${response.id}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to create your service request. Please try again.");
      }
    }
  };

  const urgencyOptions: Array<{ level: UrgencyLevel; label: string; desc: string }> = [
    { level: "low", label: "Low", desc: "Within a few days (non-urgent maintenance)" },
    { level: "normal", label: "Normal", desc: "Today or tomorrow (standard dispatch)" },
    { level: "high", label: "High", desc: "Within 2-4 hours (prompt response needed)" },
    { level: "emergency", label: "Emergency", desc: "Immediate critical assistance required" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Describe Your Problem
        </h1>
        <p className="text-sm text-slate-600">
          Provide details about the issue so our AI can accurately extract trade requirements and match nearby workers.
        </p>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Description Field */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>What needs fixing or installation? *</span>
            <span className="text-xs font-medium text-slate-400">
              {description.length} / 2000 characters
            </span>
          </label>
          <textarea
            id="description"
            required
            rows={5}
            minLength={5}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"Tell us what's wrong. For example:\n'My kitchen tap is leaking and water is collecting under the sink.'"}
            className="w-full rounded-2xl border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600 leading-relaxed placeholder:text-slate-400"
          />
          <p className="text-xs text-slate-500">
            Minimum 5 characters. Describe any symptoms, noises, or specific fixtures to help our AI extract the right skills.
          </p>
        </div>

        {/* Urgency Selector */}
        <div className="space-y-3 pt-2">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Service Urgency *</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {urgencyOptions.map((opt) => {
              const isSelected = urgency === opt.level;
              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => setUrgency(opt.level)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 text-slate-900 shadow-sm ring-1 ring-blue-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider">{opt.label}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>Service Location *</span>
            </label>

            <button
              type="button"
              onClick={handleUseDemoLocation}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 self-start sm:self-auto underline"
            >
              (Dev: Use Bengaluru Demo)
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingGps}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 px-4 text-sm font-bold transition disabled:opacity-50"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Detecting location...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  <span>Use my current location</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsManualLocationOpen(!isManualLocationOpen)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-3 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{isManualLocationOpen ? "Hide manual inputs" : "Enter location manually"}</span>
            </button>
          </div>

          {/* Location Status Badge */}
          {locationStatus && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{locationStatus}</span>
            </div>
          )}

          {/* Manual Input Fields Fallback */}
          {isManualLocationOpen && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Manual Coordinates
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="latitude" className="text-xs font-semibold text-slate-700">Latitude (-90 to 90)</label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 12.9716"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="longitude" className="text-xs font-semibold text-slate-700">Longitude (-180 to 180)</label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 77.5946"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label htmlFor="addressText" className="text-xs font-semibold text-slate-700">Neighborhood / Street (Optional)</label>
                <input
                  id="addressText"
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="e.g. Indiranagar, Bengaluru"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submission CTA */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSubmitting || description.trim().length < 5}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-slate-800 shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating your request...</span>
              </>
            ) : (
              <>
                <span>Submit Service Request</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
