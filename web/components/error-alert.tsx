import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorAlert({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorAlertProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-900">{title}</h4>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-800 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-md transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
