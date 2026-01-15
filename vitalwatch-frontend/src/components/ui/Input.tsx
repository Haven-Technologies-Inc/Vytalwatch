"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      showPasswordToggle,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    const hasError = !!error;
    const hasSuccess = !!success;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            type={inputType}
            className={cn(
              "flex h-11 w-full rounded-lg border bg-white dark:bg-slate-800 px-4 py-2 text-sm transition-all duration-200",
              "placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900",
              leftIcon && "pl-10",
              (rightIcon || (isPassword && showPasswordToggle)) && "pr-10",
              hasError
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : hasSuccess
                ? "border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500"
                : "border-slate-200 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500",
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
          {hasError && !rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          {hasSuccess && !rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
              <CheckCircle className="h-4 w-4" />
            </div>
          )}
        </div>
        {(error || success || hint) && (
          <p
            className={cn(
              "mt-1.5 text-sm",
              hasError
                ? "text-red-500"
                : hasSuccess
                ? "text-emerald-500"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
