"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { ServiceRequest, UrgencyLevel } from "@/types/service-request";
import { validateCoordinates } from "@/lib/utils";
import { ErrorAlert } from "@/components/error-alert";
import {
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function CreateRequestPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel>("normal");
  const [latitude, setLatitude] = useState<string>("12.9500");
  const [longitude, setLongitude] = useState<string>("77.6300");
  const [addressText, setAddressText] = useState("Indiranagar, Bengaluru");
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingGps(true);
    setLocationStatus("Acquiring GPS position...");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocationStatus(`GPS acquired (accuracy ±${Math.round(pos.coords.accuracy)}m)`);
        setIsDetectingGps(false);
      },
      (err) => {
        setIsDetectingGps(false);
        setLocationStatus(null);
        setError(`Location access denied or unavailable: ${err.message}. You can enter coordinates manually.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const handleUseDemoLocation = () => {
    setLatitude("12.9500");
    setLongitude("77.6300");
    setAddressText("Indiranagar, Bengaluru");
    setLocationStatus("Applied Bengaluru Demo coordinates");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 5) {
      setError("Problem description must be at least 5 characters long.");
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (!validateCoordinates(latNum, lonNum)) {
      setError("Please provide valid coordinates (-90 ≤ latitude ≤ 90 and -180 ≤ longitude ≤ 180).");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post<ServiceRequest>("/api/v1/service-requests", {
        description: description.trim(),
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
        setError("Failed to submit service request. Please try again.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Create a Service Request
        </h1>
        <p className="text-sm text-slate-600">
          Describe the problem and specify your service location.
        </p>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Description Field */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>What seems to be the problem? *</span>
            <span className="text-xs font-normal text-slate-500">
              {description.length}/2000 chars
            </span>
          </label>
          <textarea
            required
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. My kitchen PVC drain pipe is leaking heavily under the sink and needs immediate repair."
            className="w-full rounded-xl border border-slate-300 p-3.5 text-sm outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          <p className="text-xs text-slate-500">
            Be as specific as you can. Our AI requirement engine analyzes your words to match qualified trade skills.
          </p>
        </div>

        {/* Urgency Selector */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>How urgent is this?</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { level: "low", label: "Low", desc: "Within few days" },
              { level: "normal", label: "Normal", desc: "Today / Tomorrow" },
              { level: "high", label: "High", desc: "Within 2-4 hours" },
              { level: "emergency", label: "Emergency", desc: "Immediate critical" },
            ].map((item) => (
              <button
                key={item.level}
                type="button"
                onClick={() => setUrgency(item.level as UrgencyLevel)}
                className={`rounded-xl border p-3 text-left transition ${
                  urgency === item.level
                    ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold uppercase">{item.label}</div>
                <div className="text-[11px] text-slate-500">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-3 border-t border-slate-100 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>Service Location Coordinates</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {isDetectingGps ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Navigation className="h-3.5 w-3.5" />
                )}
                <span>Use My Location</span>
              </button>

              <button
                type="button"
                onClick={handleUseDemoLocation}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
              >
                Bengaluru Demo
              </button>
            </div>
          </div>

          {locationStatus && (
            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              ✓ {locationStatus}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Latitude (-90 to 90)</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="12.9500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Longitude (-180 to 180)</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="77.6300"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-slate-600">Address / Landmark (Optional)</label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="e.g. 100 Feet Road, Indiranagar, Bengaluru"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating your request...</span>
              </>
            ) : (
              <>
                <span>Submit & Proceed to AI Extraction</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
