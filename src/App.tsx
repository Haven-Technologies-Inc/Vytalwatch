import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
// Auth Pages
import { LoginPage, SignupPage, ForgotPasswordPage } from './pages/auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
// Landing Page
import { LandingPage } from './components/landing/LandingPage';
// Individual Verification Flow
import { WelcomeScreen } from './components/verification/WelcomeScreen';
import { CountrySelectionScreen } from './components/verification/CountrySelectionScreen';
import { DynamicVerificationFlow } from './components/verification/DynamicVerificationFlow';
import { DocumentVerificationScreen } from './components/verification/DocumentVerificationScreen';
import { BiometricVerificationScreen } from './components/verification/BiometricVerificationScreen';
import { PhoneVerificationScreen } from './components/verification/PhoneVerificationScreen';
import { SuccessScreen } from './components/verification/SuccessScreen';
// Business Onboarding Flow
import { BusinessWelcome } from './components/business/BusinessWelcome';
import { BusinessTypeSelection } from './components/business/BusinessTypeSelection';
import { BusinessRegistrationForm } from './components/business/BusinessRegistrationForm';
import { DocumentUploadScreen } from './components/business/DocumentUploadScreen';
import { PricingSelection } from './components/business/PricingSelection';
import { APIKeyGeneration } from './components/business/APIKeyGeneration';
// Dashboards
import { BusinessDashboard } from './components/dashboard/BusinessDashboard';
import { IndividualDashboard } from './components/dashboard/IndividualDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
// Shared Components
import { DeveloperPortal } from './components/DeveloperPortal';
import { DeveloperTools } from './components/DeveloperTools';
import { APIPlayground } from './components/APIPlayground';
import { ProductsShowcase } from './components/ProductsShowcase';
import { AfricanFeatures } from './components/AfricanFeatures';
import { AdvancedEndpoints } from './components/AdvancedEndpoints';
// Types
import { AfricanCountry } from './config/african-countries';
import { BusinessType, BusinessRegistrationData, APITier, getRecommendedTier } from './config/business-verification';

type FlowType = 'individual' | 'business';

type AuthStep = 'login' | 'signup' | 'forgot-password';

type IndividualStep = 'landing' | 'welcome' | 'country' | 'dynamic-flow' | 'document' | 'biometric' | 'phone' | 'success' | 'dashboard';

type BusinessStep = 'landing' | 'business-welcome' | 'business-type' | 'business-registration' | 'business-documents' | 'pricing' | 'api-keys' | 'business-dashboard';

type DeveloperStep = 'developer' | 'dev-tools' | 'api-playground' | 'products' | 'african-features' | 'advanced-endpoints';

type AdminStep = 'admin-dashboard';

type AppStep = AuthStep | IndividualStep | BusinessStep | DeveloperStep | AdminStep;

export default function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  const [currentFlow, setCurrentFlow] = useState<FlowType>('business');
  const [currentStep, setCurrentStep] = useState<AppStep>('landing');
  const [language, setLanguage] = useState('en');

  // Individual Flow State
  const [selectedCountry, setSelectedCountry] = useState<AfricanCountry | null>(null);

  // Business Flow State
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [businessData, setBusinessData] = useState<BusinessRegistrationData | null>(null);
  const [selectedTier, setSelectedTier] = useState<APITier | null>(null);

  // Handle hash changes for developer portal navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'developer') setCurrentStep('developer');
      if (hash === 'dev-tools') setCurrentStep('dev-tools');
      if (hash === 'api-playground') setCurrentStep('api-playground');
      if (hash === 'products') setCurrentStep('products');
      if (hash === 'african-features') setCurrentStep('african-features');
      if (hash === 'advanced-endpoints') setCurrentStep('advanced-endpoints');
      if (hash === 'login') setCurrentStep('login');
      if (hash === 'signup') setCurrentStep('signup');
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (isAuthenticated && ['login', 'signup', 'forgot-password'].includes(currentStep)) {
      // Redirect based on user role
      if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        setCurrentStep('admin-dashboard');
      } else if (user?.role === 'BUSINESS') {
        setCurrentStep('business-dashboard');
      } else {
        setCurrentStep('dashboard');
      }
    }
  }, [isAuthenticated, currentStep, user]);

  // ========== AUTH HANDLERS ==========
  const handleLoginClick = () => setCurrentStep('login');
  const handleSignupClick = () => setCurrentStep('signup');
  const handleForgotPasswordClick = () => setCurrentStep('forgot-password');

  const handleAuthSuccess = () => {
    // Redirect based on user role after successful auth
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      setCurrentStep('admin-dashboard');
    } else if (user?.role === 'BUSINESS') {
      setCurrentStep('business-dashboard');
    } else {
      setCurrentStep('dashboard');
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentStep('landing');
  };

  // ========== INDIVIDUAL FLOW HANDLERS ==========
  const handleStartIndividualVerification = () => {
    setCurrentFlow('individual');
    setCurrentStep('country');
  };

  const handleCountrySelected = (country: AfricanCountry) => {
    setSelectedCountry(country);
    setCurrentStep('dynamic-flow');
  };

  const handleDynamicFlowComplete = () => {
    setCurrentStep('document');
  };

  const handleDocumentCaptured = () => {
    setCurrentStep('success');
  };

  const handleIndividualComplete = () => {
    setCurrentStep('dashboard');
  };

  // ========== BUSINESS FLOW HANDLERS ==========
  const handleStartBusinessOnboarding = () => {
    setCurrentFlow('business');
    setCurrentStep('business-type');
  };

  const handleBusinessTypeSelected = (type: BusinessType) => {
    setBusinessType(type);
    setCurrentStep('business-registration');
  };

  const handleBusinessRegistrationSubmit = (data: BusinessRegistrationData) => {
    setBusinessData(data);
    setCurrentStep('business-documents');
  };

  const handleDocumentsUploaded = () => {
    const volumeString = businessData?.estimatedMonthlyVolume || '0-1000';
    const volumeNumber = volumeString.includes('+')
      ? 100000
      : parseInt(volumeString.split('-')[1] || '1000');

    getRecommendedTier(businessType || 'developer', volumeNumber);
    setCurrentStep('pricing');
  };

  const handleTierSelected = (tier: APITier) => {
    setSelectedTier(tier);
    setCurrentStep('api-keys');
  };

  const handleAPIKeysComplete = () => {
    setCurrentStep('business-dashboard');
  };

  // ========== DEMO ACCESS HANDLERS ==========
  const handleBusinessDemoLogin = () => {
    setCurrentFlow('business');
    setCurrentStep('business-dashboard');
  };

  const handleIndividualDemoLogin = () => {
    setCurrentFlow('individual');
    setCurrentStep('dashboard');
  };

  const handleAdminDemoLogin = () => {
    setCurrentStep('admin-dashboard');
  };

  // ========== NAVIGATION HANDLERS ==========
  const handleBack = () => {
    switch (currentStep) {
      case 'country':
        setCurrentStep('business-welcome');
        break;
      case 'dynamic-flow':
        setCurrentStep('country');
        break;
      case 'document':
        setCurrentStep('dynamic-flow');
        break;
      case 'business-type':
        setCurrentStep('business-welcome');
        break;
      case 'business-registration':
        setCurrentStep('business-type');
        break;
      case 'business-documents':
        setCurrentStep('business-registration');
        break;
      case 'pricing':
        setCurrentStep('business-documents');
        break;
      default:
        break;
    }
  };

  const handleSkipVerification = () => {
    setCurrentStep('success');
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A2540] to-[#1a365d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00D4AA] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold">
            <span className="text-[#00D4AA]">Resh</span>ADX
          </h2>
          <p className="text-gray-400 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--neutral-50)]">
      {/* ========== AUTH PAGES ========== */}
      {currentStep === 'login' && (
        <LoginPage
          onSuccess={handleAuthSuccess}
          onSignupClick={handleSignupClick}
          onForgotPasswordClick={handleForgotPasswordClick}
        />
      )}

      {currentStep === 'signup' && (
        <SignupPage
          onSuccess={handleAuthSuccess}
          onLoginClick={handleLoginClick}
        />
      )}

      {currentStep === 'forgot-password' && (
        <ForgotPasswordPage
          onSuccess={handleLoginClick}
          onBackToLogin={handleLoginClick}
        />
      )}

      {/* ========== LANDING PAGE ========== */}
      {currentStep === 'landing' && (
        <LandingPage
          onGetStarted={handleStartIndividualVerification}
          onBusinessSignup={handleStartBusinessOnboarding}
          onBusinessDemoLogin={isAuthenticated ? handleBusinessDemoLogin : handleLoginClick}
          onIndividualDemoLogin={isAuthenticated ? handleIndividualDemoLogin : handleLoginClick}
          onAdminDemoLogin={isAuthenticated ? handleAdminDemoLogin : handleLoginClick}
        />
      )}

      {/* ========== BUSINESS FLOW ========== */}
      {currentStep === 'business-welcome' && (
        <BusinessWelcome
          onStartBusiness={handleStartBusinessOnboarding}
          onViewIndividual={handleStartIndividualVerification}
        />
      )}

      {currentStep === 'business-type' && (
        <BusinessTypeSelection
          onSelectType={handleBusinessTypeSelected}
          onBack={handleBack}
        />
      )}

      {currentStep === 'business-registration' && businessType && (
        <BusinessRegistrationForm
          businessType={businessType}
          onSubmit={handleBusinessRegistrationSubmit}
          onBack={handleBack}
        />
      )}

      {currentStep === 'business-documents' && businessData && (
        <DocumentUploadScreen
          countryCode={businessData.country}
          businessType={businessData.businessType}
          onComplete={handleDocumentsUploaded}
          onBack={handleBack}
        />
      )}

      {currentStep === 'pricing' && (
        <PricingSelection
          recommendedTier={
            businessType && businessData
              ? getRecommendedTier(
                  businessType,
                  parseInt(businessData.estimatedMonthlyVolume.split('-')[1] || '1000')
                )
              : 'professional'
          }
          onSelectTier={handleTierSelected}
          onBack={handleBack}
        />
      )}

      {currentStep === 'api-keys' && selectedTier && businessData && (
        <APIKeyGeneration
          tier={selectedTier}
          companyName={businessData.companyName}
          onComplete={handleAPIKeysComplete}
        />
      )}

      {/* ========== INDIVIDUAL FLOW ========== */}
      {currentStep === 'welcome' && (
        <WelcomeScreen
          onStart={handleStartIndividualVerification}
          language={language}
          onLanguageChange={setLanguage}
        />
      )}

      {currentStep === 'country' && (
        <CountrySelectionScreen
          onCountrySelect={handleCountrySelected}
          language={language}
        />
      )}

      {currentStep === 'dynamic-flow' && selectedCountry && (
        <DynamicVerificationFlow
          country={selectedCountry}
          onComplete={handleDynamicFlowComplete}
          onBack={handleBack}
          language={language}
        />
      )}

      {currentStep === 'document' && (
        <DocumentVerificationScreen
          onNext={handleDocumentCaptured}
          onBack={handleBack}
          onSkip={handleSkipVerification}
        />
      )}

      {currentStep === 'biometric' && (
        <BiometricVerificationScreen
          onNext={handleDocumentCaptured}
          onBack={handleBack}
          onSkip={handleSkipVerification}
        />
      )}

      {currentStep === 'phone' && (
        <PhoneVerificationScreen
          onNext={handleDocumentCaptured}
          onBack={handleBack}
          onSkip={handleSkipVerification}
        />
      )}

      {currentStep === 'success' && (
        <SuccessScreen
          onComplete={handleIndividualComplete}
        />
      )}

      {/* ========== PROTECTED DASHBOARDS ========== */}
      {currentStep === 'business-dashboard' && (
        <ProtectedRoute onUnauthenticated={handleLoginClick}>
          <BusinessDashboard />
        </ProtectedRoute>
      )}

      {currentStep === 'dashboard' && (
        <ProtectedRoute onUnauthenticated={handleLoginClick}>
          <IndividualDashboard />
        </ProtectedRoute>
      )}

      {currentStep === 'admin-dashboard' && (
        <ProtectedRoute onUnauthenticated={handleLoginClick} requiredRole="ADMIN">
          <AdminDashboard />
        </ProtectedRoute>
      )}

      {/* ========== DEVELOPER PORTAL & OTHER SCREENS ========== */}
      {currentStep === 'developer' && (
        <DeveloperPortal
          language={language}
          onLanguageChange={setLanguage}
        />
      )}

      {currentStep === 'dev-tools' && (
        <DeveloperTools
          language={language}
          onLanguageChange={setLanguage}
        />
      )}

      {currentStep === 'api-playground' && (
        <APIPlayground
          language={language}
          onLanguageChange={setLanguage}
        />
      )}

      {currentStep === 'products' && (
        <ProductsShowcase
          language={language}
          onLanguageChange={setLanguage}
        />
      )}

      {currentStep === 'african-features' && (
        <AfricanFeatures
          language={language}
          onLanguageChange={setLanguage}
        />
      )}

      {currentStep === 'advanced-endpoints' && (
        <AdvancedEndpoints
          language={language}
          onLanguageChange={setLanguage}
        />
      )}
    </div>
  );
}
