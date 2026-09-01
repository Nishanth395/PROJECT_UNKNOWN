"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { WorkerProfile, WorkerProfileCreateInput } from "@/types/worker-profile";
import { validateCoordinates } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import {
  Briefcase,
  MapPin,
  Navigation,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sliders,
  ShieldCheck,
} from "lucide-react";

export default function WorkerOnboardingPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState<string>("5");
  const [serviceRadiusKm, setServiceRadiusKm] = useState<string>("15");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [addressText, setAddressText] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isManualLocationOpen, setIsManualLocationOpen] = useState<boolean>(false);

  const [isCheckingProfile, setIsCheckingProfile] = useState<boolean>(true);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "worker") {
      router.push("/dashboard");
      return;
    }
    if (user) {
      apiClient
        .get<WorkerProfile>("/api/v1/workers/me")
        .then(() => {
          // Worker profile already exists, redirect to dashboard
          router.push("/worker/dashboard");
        })
        .catch((err: unknown) => {
          if (err instanceof ApiException && err.statusCode === 404) {
            // Profile doesn't exist yet, stay on onboarding
            setIsCheckingProfile(false);
          } else {
            setIsCheckingProfile(false);
          }
        });
    }
  }, [user, isAuthLoading, router]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter coordinates manually.");
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
    setLatitude("12.9716");
    setLongitude("77.6412");
    setAddressText("Indiranagar, Bengaluru");
    setLocationStatus("Location detected ✓ (Lat: 12.9716, Lon: 77.6412 — Bengaluru Demo)");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const expNum = parseFloat(experienceYears);
    if (isNaN(expNum) || expNum < 0) {
      setError("Total experience years must be 0 or greater.");
      return;
    }

    const radNum = parseFloat(serviceRadiusKm);
    if (isNaN(radNum) || radNum <= 0) {
      setError("Operating service radius must be greater than 0 km.");
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (!validateCoordinates(latNum, lonNum)) {
      setError("Please provide valid operating base coordinates (-90 ≤ latitude ≤ 90 and -180 ≤ longitude ≤ 180).");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: WorkerProfileCreateInput = {
        bio: bio.trim() || undefined,
        experience_years: expNum,
        service_radius_km: radNum,
        latitude: latNum,
        longitude: lonNum,
        is_available: isAvailable,
        address_text: addressText.trim() || undefined,
      };

      await apiClient.post<WorkerProfile>("/api/v1/workers/me", payload);
      // Navigate to skills configuration
      router.push("/worker/skills");
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to create worker profile. Please try again.");
      }
    }
  };

  if (isAuthLoading || isCheckingProfile) {
    return <LoadingSpinner message="Checking worker profile status..." />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold uppercase tracking-wider mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Worker Onboarding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Complete Your Trade Profile
        </h1>
        <p className="text-sm text-slate-600">
          Set up your operating area, base coordinates, and experience to start receiving relevant nearby service requests.
        </p>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Professional Bio */}
        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-bold text-slate-900">
            Professional Bio / Summary
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. Master residential and commercial electrician with over 8 years experience in Bangalore."
            className="w-full rounded-2xl border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Experience & Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="experienceYears" className="text-sm font-bold text-slate-900">
              Total Professional Experience (Years) *
            </label>
            <input
              id="experienceYears"
              type="number"
              step="0.5"
              min="0"
              required
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              placeholder="e.g. 5"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="serviceRadiusKm" className="text-sm font-bold text-slate-900">
              Operating Service Radius (km) *
            </label>
            <input
              id="serviceRadiusKm"
              type="number"
              step="1"
              min="1"
              max="100"
              required
              value={serviceRadiusKm}
              onChange={(e) => setServiceRadiusKm(e.target.value)}
              placeholder="e.g. 15"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>Base Operating Location *</span>
            </label>

            <button
              type="button"
              onClick={handleUseDemoLocation}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline self-start sm:self-auto"
            >
              (Demo: Indiranagar, Bengaluru)
            </button>
          </div>

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
                  <span>Detecting coordinates...</span>
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

          {locationStatus && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{locationStatus}</span>
            </div>
          )}

          {isManualLocationOpen && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Manual Base Coordinates
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
                    placeholder="12.9716"
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
                    placeholder="77.6412"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label htmlFor="addressText" className="text-xs font-semibold text-slate-700">Neighborhood / Workshop Address (Optional)</label>
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

        {/* Initial Availability */}
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-slate-900">Immediate Availability</div>
            <div className="text-xs text-slate-500">
              Online workers can receive matching job requests within their radius.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
              isAvailable
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            <span>{isAvailable ? "🟢 Online" : "⚪ Offline"}</span>
          </button>
        </div>

        {/* Submission CTA */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-slate-800 shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>Continue to Select Skills</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
