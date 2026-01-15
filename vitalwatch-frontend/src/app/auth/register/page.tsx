"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import {
  Activity,
  Mail,
  Lock,
  User,
  Building,
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react";

type AccountType = "provider" | "organization" | "patient";

interface FormData {
  accountType: AccountType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  npi: string;
  specialty: string;
  inviteCode: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    accountType: "provider",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    npi: "",
    specialty: "",
    inviteCode: "",
  });

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    // Simulate registration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    router.push("/auth/login?registered=true");
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return formData.accountType !== "";
      case 2:
        return (
          formData.firstName !== "" &&
          formData.lastName !== "" &&
          formData.email !== "" &&
          formData.email.includes("@")
        );
      case 3:
        return (
          formData.password.length >= 8 &&
          formData.password === formData.confirmPassword
        );
      default:
        return true;
    }
  };

  const accountTypes = [
    {
      type: "provider" as AccountType,
      title: "Healthcare Provider",
      description: "Doctors, nurses, and clinical staff",
      icon: User,
    },
    {
      type: "organization" as AccountType,
      title: "Healthcare Organization",
      description: "Clinics, hospitals, and practices",
      icon: Building,
    },
    {
      type: "patient" as AccountType,
      title: "Patient",
      description: "Requires invite code from provider",
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center">
              <Activity className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              VitalWatch<span className="text-blue-600">AI</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
            Create your account
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Start your free 30-day trial
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step
                    ? "bg-emerald-500 text-white"
                    : s === step
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    s < step
                      ? "bg-emerald-500"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}

          {/* Step 1: Account Type */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Choose your account type
              </h2>
              <div className="space-y-3">
                {accountTypes.map((account) => (
                  <button
                    key={account.type}
                    onClick={() => updateFormData("accountType", account.type)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      formData.accountType === account.type
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.accountType === account.type
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <account.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {account.title}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {account.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Personal Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Personal information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => updateFormData("firstName", e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => updateFormData("lastName", e.target.value)}
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
              />

              {formData.accountType === "provider" && (
                <>
                  <Input
                    label="NPI Number"
                    placeholder="1234567890"
                    value={formData.npi}
                    onChange={(e) => updateFormData("npi", e.target.value)}
                  />
                  <Input
                    label="Specialty"
                    placeholder="e.g., Cardiology"
                    value={formData.specialty}
                    onChange={(e) => updateFormData("specialty", e.target.value)}
                  />
                </>
              )}

              {formData.accountType === "organization" && (
                <Input
                  label="Organization Name"
                  placeholder="Memorial Clinic"
                  value={formData.organizationName}
                  onChange={(e) =>
                    updateFormData("organizationName", e.target.value)
                  }
                  leftIcon={<Building className="h-4 w-4" />}
                />
              )}

              {formData.accountType === "patient" && (
                <Input
                  label="Invite Code"
                  placeholder="Enter code from your provider"
                  value={formData.inviteCode}
                  onChange={(e) => updateFormData("inviteCode", e.target.value)}
                  required
                />
              )}
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Create your password
              </h2>
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={(e) => updateFormData("password", e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                showPasswordToggle
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  updateFormData("confirmPassword", e.target.value)
                }
                leftIcon={<Lock className="h-4 w-4" />}
                showPasswordToggle
                error={
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword
                    ? "Passwords do not match"
                    : ""
                }
                required
              />

              {/* Password Requirements */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Password requirements:
                </p>
                <ul className="space-y-1 text-sm">
                  {[
                    { text: "At least 8 characters", met: formData.password.length >= 8 },
                    { text: "Contains a number", met: /\d/.test(formData.password) },
                    {
                      text: "Contains uppercase letter",
                      met: /[A-Z]/.test(formData.password),
                    },
                  ].map((req, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-2 ${
                        req.met
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {req.met ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-current" />
                      )}
                      {req.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  I agree to the{" "}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => {
                if (step < 3) {
                  setStep(step + 1);
                } else {
                  handleSubmit();
                }
              }}
              disabled={!validateStep()}
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {step === 3 ? "Create Account" : "Continue"}
            </Button>
          </div>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
