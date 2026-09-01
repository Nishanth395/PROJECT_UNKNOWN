"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { CategoriesSkillsResponse } from "@/types/skill";
import { WorkerSkillsResponse, WorkerSkillItem } from "@/types/worker-profile";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import {
  Layers,
  Check,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function WorkerSkillsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [catalog, setCatalog] = useState<CategoriesSkillsResponse | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Map<string, { skill_name: string; category: string; experience_years: number }>>(
    new Map()
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
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
      Promise.all([
        apiClient.get<CategoriesSkillsResponse>("/api/v1/skills/grouped"),
        apiClient.get<WorkerSkillsResponse>("/api/v1/workers/me/skills"),
      ])
        .then(([catalogRes, workerSkillsRes]) => {
          setCatalog(catalogRes);
          const initialMap = new Map<string, { skill_name: string; category: string; experience_years: number }>();
          workerSkillsRes.skills.forEach((s) => {
            initialMap.set(s.skill_id, {
              skill_name: s.skill_name,
              category: s.category,
              experience_years: s.experience_years ?? 3,
            });
          });
          setSelectedSkills(initialMap);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          setIsLoading(false);
          if (err instanceof ApiException && err.statusCode === 404) {
            // Profile not created yet
            router.push("/worker/onboarding");
          } else if (err instanceof ApiException) {
            setError(err.message);
          } else {
            setError("Failed to load skills catalog.");
          }
        });
    }
  }, [user, isAuthLoading, router]);

  const toggleSkill = (skillId: string, skillName: string, category: string) => {
    setSaveSuccess(false);
    setSelectedSkills((prev) => {
      const next = new Map(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.set(skillId, {
          skill_name: skillName,
          category,
          experience_years: 3,
        });
      }
      return next;
    });
  };

  const updateExperience = (skillId: string, years: number) => {
    setSaveSuccess(false);
    setSelectedSkills((prev) => {
      const next = new Map(prev);
      const existing = next.get(skillId);
      if (existing) {
        next.set(skillId, {
          ...existing,
          experience_years: Math.max(0, years),
        });
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedSkills.size === 0) {
      setError("Please select at least one canonical skill you offer.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const skillsPayload = Array.from(selectedSkills.entries()).map(([skill_id, data]) => ({
        skill_id,
        experience_years: data.experience_years,
      }));

      await apiClient.put<WorkerSkillsResponse>("/api/v1/workers/me/skills", {
        skills: skillsPayload,
      });

      setIsSaving(false);
      setSaveSuccess(true);
    } catch (err: unknown) {
      setIsSaving(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to update skills.");
      }
    }
  };

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Loading canonical skills catalog..." />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="h-3.5 w-3.5" />
            <span>Service Skills</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Manage Your Trade Skills
          </h1>
          <p className="text-sm text-slate-600">
            Select the verified canonical trade skills you provide and specify your experience level.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/worker/dashboard")}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Dashboard
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Skills ({selectedSkills.size})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {saveSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between text-emerald-800 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Your skills and experience levels have been successfully updated!</span>
          </div>
          <button
            onClick={() => router.push("/worker/feed")}
            className="inline-flex items-center gap-1 text-xs font-bold underline hover:text-emerald-950"
          >
            <span>View Matching Job Feed</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Selected Skills Summary Bar */}
      {selectedSkills.size > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Selected Skills ({selectedSkills.size})</span>
            <span className="text-slate-400 font-normal">Click a skill badge to configure experience</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(selectedSkills.entries()).map(([skillId, data]) => (
              <div
                key={skillId}
                className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="font-bold text-slate-900 truncate">{data.skill_name}</div>
                  <div className="text-[10px] text-blue-700 font-semibold">{data.category}</div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="40"
                      value={data.experience_years}
                      onChange={(e) => updateExperience(skillId, parseFloat(e.target.value) || 0)}
                      className="w-10 text-center font-bold text-xs outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">yrs</span>
                  </div>

                  <button
                    onClick={() => toggleSkill(skillId, data.skill_name, data.category)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                    title="Remove skill"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalog Grouped by Category */}
      <div className="space-y-6">
        {catalog?.categories.map((cat) => (
          <div key={cat.category} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">{cat.category}</h2>
              <span className="text-xs font-semibold text-slate-400">({cat.skills.length} available)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.skills.map((s) => {
                const isSelected = selectedSkills.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id, s.name, s.category)}
                    className={`flex items-start justify-between rounded-2xl p-4 text-left transition border ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <div className={`text-sm font-bold ${isSelected ? "text-blue-950" : "text-slate-900"}`}>
                        {s.name}
                      </div>
                      {s.description && (
                        <div className="text-xs text-slate-500 line-clamp-2">
                          {s.description}
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
