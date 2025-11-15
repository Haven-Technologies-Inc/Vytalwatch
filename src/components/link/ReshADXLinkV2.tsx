// ReshADX Link V2 - Enhanced Account Linking Experience
// Equivalent to Plaid Link with African optimizations

import React, { useState, useEffect } from 'react';
import {
  Search, ChevronRight, Shield, Zap, AlertCircle, CheckCircle,
  Smartphone, Globe, CreditCard, Building2, Loader, ArrowLeft,
  Phone, Lock, Fingerprint, Eye, EyeOff, Wifi, WifiOff, MessageSquare
} from 'lucide-react';
import { Button } from '../Button';

// ============================================================================
// TYPES
// ============================================================================

interface ReshADXLinkV2Props {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: LinkMetadata) => void;
  onExit: (error: LinkError | null, metadata: LinkMetadata) => void;
  onEvent?: (eventName: string, metadata: any) => void;
  language?: string;
}

interface Institution {
  institution_id: string;
  name: string;
  type: 'BANK' | 'MOBILE_MONEY' | 'MICROFINANCE' | 'CREDIT_UNION';
  logo_url: string;
  primary_color: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  supports_oauth: boolean;
  popular: boolean;
}

interface LinkMetadata {
  institution_id?: string;
  institution_name?: string;
  link_session_id: string;
  accounts: Array<{
    account_id: string;
    name: string;
    type: string;
    mask?: string;
  }>;
  transfer_status?: string;
}

interface LinkError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string;
}

type LinkStep =
  | 'SELECT_INSTITUTION'
  | 'RETURNING_USER'
  | 'AUTH_METHOD'
  | 'CREDENTIALS'
  | 'MFA'
  | 'ACCOUNT_SELECT'
  | 'CONSENT'
  | 'SUCCESS'
  | 'ERROR'
  | 'USSD_FALLBACK'
  | 'OFFLINE_MODE';

// ============================================================================
// MOCK DATA (Replace with API calls)
// ============================================================================

const MOCK_INSTITUTIONS: Institution[] = [
  {
    institution_id: 'ins_gh_gcb',
    name: 'GCB Bank',
    type: 'BANK',
    logo_url: '/logos/gcb.png',
    primary_color: '#D4AF37',
    status: 'HEALTHY',
    supports_oauth: true,
    popular: true,
  },
  {
    institution_id: 'ins_gh_mtn',
    name: 'MTN Mobile Money',
    type: 'MOBILE_MONEY',
    logo_url: '/logos/mtn.png',
    primary_color: '#FFCB05',
    status: 'HEALTHY',
    supports_oauth: false,
    popular: true,
  },
  {
    institution_id: 'ins_gh_vodafone',
    name: 'Vodafone Cash',
    type: 'MOBILE_MONEY',
    logo_url: '/logos/vodafone.png',
    primary_color: '#E60000',
    status: 'HEALTHY',
    supports_oauth: false,
    popular: true,
  },
  {
    institution_id: 'ins_gh_ecobank',
    name: 'Ecobank Ghana',
    type: 'BANK',
    logo_url: '/logos/ecobank.png',
    primary_color: '#003DA5',
    status: 'HEALTHY',
    supports_oauth: true,
    popular: true,
  },
  {
    institution_id: 'ins_ng_gtbank',
    name: 'GTBank Nigeria',
    type: 'BANK',
    logo_url: '/logos/gtbank.png',
    primary_color: '#FF6600',
    status: 'HEALTHY',
    supports_oauth: true,
    popular: false,
  },
  {
    institution_id: 'ins_ke_mpesa',
    name: 'M-Pesa Kenya',
    type: 'MOBILE_MONEY',
    logo_url: '/logos/mpesa.png',
    primary_color: '#00A651',
    status: 'HEALTHY',
    supports_oauth: false,
    popular: true,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ReshADXLinkV2({
  linkToken,
  onSuccess,
  onExit,
  onEvent,
  language = 'en',
}: ReshADXLinkV2Props) {
  const [currentStep, setCurrentStep] = useState<LinkStep>('RETURNING_USER');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // Returning user state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Session tracking
  const [linkSessionId] = useState(`link_session_${Date.now()}`);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      trackEvent('NETWORK_ONLINE', {});
    };
    const handleOffline = () => {
      setIsOnline(false);
      trackEvent('NETWORK_OFFLINE', {});
      setCurrentStep('OFFLINE_MODE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for returning user on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem('reshadx_user_phone');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setIsReturningUser(true);
      trackEvent('RETURNING_USER_DETECTED', { phone: savedPhone });
    } else {
      setCurrentStep('SELECT_INSTITUTION');
    }
  }, []);

  const trackEvent = (eventName: string, metadata: any) => {
    if (onEvent) {
      onEvent(eventName, {
        ...metadata,
        link_session_id: linkSessionId,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const filteredInstitutions = MOCK_INSTITUTIONS.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularInstitutions = filteredInstitutions.filter((i) => i.popular);
  const otherInstitutions = filteredInstitutions.filter((i) => !i.popular);

  const handleInstitutionSelect = (institution: Institution) => {
    setSelectedInstitution(institution);
    trackEvent('INSTITUTION_SELECTED', {
      institution_id: institution.institution_id,
      institution_name: institution.name,
    });

    if (institution.supports_oauth) {
      // OAuth flow - redirect to institution
      trackEvent('OAUTH_REDIRECT', { institution_id: institution.institution_id });
      // In real implementation, redirect to OAuth URL
      setTimeout(() => {
        setCurrentStep('ACCOUNT_SELECT');
      }, 1500);
    } else {
      setCurrentStep('AUTH_METHOD');
    }
  };

  const handleReturningUserAuth = async () => {
    setIsLoading(true);
    trackEvent('RETURNING_USER_AUTH_START', { phone: phoneNumber });

    // Simulate sending OTP
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    setCurrentStep('CREDENTIALS');
    trackEvent('OTP_SENT', { phone: phoneNumber });
  };

  const handleCredentialSubmit = async () => {
    setIsLoading(true);
    trackEvent('CREDENTIALS_SUBMIT', {
      institution_id: selectedInstitution?.institution_id,
    });

    // Simulate credential validation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate MFA challenge
    if (Math.random() > 0.5) {
      setIsLoading(false);
      setCurrentStep('MFA');
      trackEvent('MFA_REQUIRED', {});
    } else {
      setIsLoading(false);
      setCurrentStep('ACCOUNT_SELECT');
      trackEvent('AUTH_SUCCESS', {});
    }
  };

  const handleMFASubmit = async () => {
    setIsLoading(true);
    trackEvent('MFA_SUBMIT', {});

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    setCurrentStep('ACCOUNT_SELECT');
    trackEvent('MFA_SUCCESS', {});
  };

  const handleAccountSelection = () => {
    if (selectedAccounts.length === 0) {
      setError('Please select at least one account');
      return;
    }

    trackEvent('ACCOUNTS_SELECTED', { count: selectedAccounts.length });
    setCurrentStep('CONSENT');
  };

  const handleConsentAccept = async () => {
    setIsLoading(true);
    trackEvent('CONSENT_ACCEPTED', {});

    // Simulate token exchange
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const publicToken = `public-token-${Date.now()}`;
    const metadata: LinkMetadata = {
      institution_id: selectedInstitution?.institution_id,
      institution_name: selectedInstitution?.name,
      link_session_id: linkSessionId,
      accounts: selectedAccounts.map((id) => ({
        account_id: id,
        name: 'Account',
        type: 'depository',
        mask: '1234',
      })),
    };

    // Save phone for returning user experience
    if (phoneNumber) {
      localStorage.setItem('reshadx_user_phone', phoneNumber);
    }

    setIsLoading(false);
    setCurrentStep('SUCCESS');

    trackEvent('LINK_SUCCESS', metadata);

    setTimeout(() => {
      onSuccess(publicToken, metadata);
    }, 1500);
  };

  const handleExit = () => {
    trackEvent('USER_EXIT', { current_step: currentStep });
    onExit(null, {
      link_session_id: linkSessionId,
      accounts: [],
    });
  };

  const handleUSSDFallback = () => {
    trackEvent('USSD_FALLBACK_SELECTED', {});
    setCurrentStep('USSD_FALLBACK');
  };

  // ========== RENDER FUNCTIONS ==========

  const renderReturningUser = () => (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-[#06B6D4] to-[#7C3AED] rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl mb-2">Welcome back!</h2>
        <p className="text-[var(--neutral-600)]">
          We recognize your phone number. Link your account in seconds.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-2">Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-3 border border-[var(--neutral-300)] rounded-lg"
            placeholder="+233 50 123 4567"
          />
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={handleReturningUserAuth}
          disabled={!phoneNumber || isLoading}
        >
          {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Continue'}
        </Button>

        <button
          onClick={() => setCurrentStep('SELECT_INSTITUTION')}
          className="w-full text-center text-[var(--primary)] hover:underline"
        >
          I'm a new user
        </button>
      </div>
    </div>
  );

  const renderInstitutionSelect = () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--neutral-400)]" />
          <input
            type="text"
            placeholder="Search for your bank or mobile money provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-[var(--neutral-300)] rounded-lg text-lg"
            autoFocus
          />
        </div>
      </div>

      {!isOnline && (
        <div className="mb-6 p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-[var(--warning)]" />
          <div className="flex-1">
            <p className="text-sm m-0">No internet connection</p>
            <button
              onClick={handleUSSDFallback}
              className="text-[var(--primary)] text-sm hover:underline"
            >
              Use USSD instead →
            </button>
          </div>
        </div>
      )}

      {popularInstitutions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm text-[var(--neutral-600)] mb-3">POPULAR</h3>
          <div className="grid grid-cols-1 gap-3">
            {popularInstitutions.map((institution) => (
              <button
                key={institution.institution_id}
                onClick={() => handleInstitutionSelect(institution)}
                className="flex items-center gap-4 p-4 border border-[var(--neutral-200)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--neutral-100)] flex items-center justify-center flex-shrink-0">
                  {institution.type === 'MOBILE_MONEY' ? (
                    <Smartphone className="w-6 h-6" style={{ color: institution.primary_color }} />
                  ) : (
                    <Building2 className="w-6 h-6" style={{ color: institution.primary_color }} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{institution.name}</div>
                  <div className="text-sm text-[var(--neutral-600)]">
                    {institution.type.replace('_', ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {institution.status === 'HEALTHY' ? (
                    <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[var(--warning)]" />
                  )}
                  <ChevronRight className="w-5 h-5 text-[var(--neutral-400)]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {otherInstitutions.length > 0 && (
        <div>
          <h3 className="text-sm text-[var(--neutral-600)] mb-3">ALL INSTITUTIONS</h3>
          <div className="grid grid-cols-1 gap-3">
            {otherInstitutions.map((institution) => (
              <button
                key={institution.institution_id}
                onClick={() => handleInstitutionSelect(institution)}
                className="flex items-center gap-4 p-4 border border-[var(--neutral-200)] rounded-xl hover:border-[var(--primary)] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--neutral-100)] flex items-center justify-center flex-shrink-0">
                  {institution.type === 'MOBILE_MONEY' ? (
                    <Smartphone className="w-6 h-6" style={{ color: institution.primary_color }} />
                  ) : (
                    <Building2 className="w-6 h-6" style={{ color: institution.primary_color }} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{institution.name}</div>
                  <div className="text-sm text-[var(--neutral-600)]">
                    {institution.type.replace('_', ' ')}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--neutral-400)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredInstitutions.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-[var(--neutral-400)] mx-auto mb-4" />
          <p className="text-[var(--neutral-600)]">No institutions found</p>
        </div>
      )}
    </div>
  );

  const renderAuthMethod = () => (
    <div className="max-w-md mx-auto p-6">
      <button onClick={() => setSelectedInstitution(null)} className="mb-6 flex items-center gap-2 text-[var(--primary)]">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl mb-2">How would you like to connect?</h2>
        <p className="text-[var(--neutral-600)]">Choose your preferred method to link {selectedInstitution?.name}</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setCurrentStep('CREDENTIALS')}
          className="w-full p-6 border border-[var(--neutral-200)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Mobile App / Internet Banking</div>
              <div className="text-sm text-[var(--neutral-600)]">Use your online banking credentials</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--neutral-400)]" />
          </div>
        </button>

        <button
          onClick={handleUSSDFallback}
          className="w-full p-6 border border-[var(--neutral-200)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--success)]/10 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-[var(--success)]" />
            </div>
            <div className="flex-1">
              <div className="font-medium">USSD Code</div>
              <div className="text-sm text-[var(--neutral-600)]">Dial *920# on your phone (no internet needed)</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--neutral-400)]" />
          </div>
        </button>

        {selectedInstitution?.type === 'MOBILE_MONEY' && (
          <button className="w-full p-6 border border-[var(--neutral-200)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--secondary)]/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[var(--secondary)]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">SMS Verification</div>
                <div className="text-sm text-[var(--neutral-600)]">Verify via SMS code</div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--neutral-400)]" />
            </div>
          </button>
        )}
      </div>
    </div>
  );

  const renderCredentials = () => (
    <div className="max-w-md mx-auto p-6">
      <button onClick={() => setCurrentStep('AUTH_METHOD')} className="mb-6 flex items-center gap-2 text-[var(--primary)]">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-lg bg-[var(--neutral-100)] flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8" style={{ color: selectedInstitution?.primary_color }} />
        </div>
        <h2 className="text-2xl mb-2">Connect to {selectedInstitution?.name}</h2>
        <p className="text-[var(--neutral-600)]">Enter your credentials securely</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--error)]" />
          <p className="text-sm m-0 text-[var(--error)]">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm mb-2">Username / Phone Number</label>
          <input
            type="text"
            value={credentials.username}
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            className="w-full px-4 py-3 border border-[var(--neutral-300)] rounded-lg"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Password / PIN</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-[var(--neutral-300)] rounded-lg"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-5 h-5 text-[var(--neutral-400)]" /> : <Eye className="w-5 h-5 text-[var(--neutral-400)]" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-lg flex items-start gap-3">
        <Shield className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="m-0 mb-2">Your credentials are encrypted and secure</p>
          <p className="m-0 text-[var(--neutral-600)]">We never store your password. It's used only to connect your account.</p>
        </div>
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={handleCredentialSubmit}
        disabled={!credentials.username || !credentials.password || isLoading}
      >
        {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Continue Securely'}
      </Button>
    </div>
  );

  const renderMFA = () => (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[var(--success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-[var(--success)]" />
        </div>
        <h2 className="text-2xl mb-2">Verification Code</h2>
        <p className="text-[var(--neutral-600)]">
          Enter the 6-digit code sent to your phone ending in ****1234
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          maxLength={6}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
          className="w-full px-4 py-4 border border-[var(--neutral-300)] rounded-lg text-center text-2xl tracking-widest"
          placeholder="000000"
          autoFocus
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={handleMFASubmit}
        disabled={mfaCode.length !== 6 || isLoading}
      >
        {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Verify'}
      </Button>

      <button className="w-full mt-4 text-center text-[var(--primary)] hover:underline">
        Didn't receive code? Resend
      </button>
    </div>
  );

  const renderAccountSelect = () => (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <CheckCircle className="w-16 h-16 text-[var(--success)] mx-auto mb-4" />
        <h2 className="text-2xl mb-2">Select Accounts</h2>
        <p className="text-[var(--neutral-600)]">Choose which accounts to connect</p>
      </div>

      <div className="space-y-3 mb-6">
        {['Savings Account (...1234)', 'Current Account (...5678)', 'Mobile Money Wallet'].map((account, idx) => {
          const accountId = `account_${idx}`;
          const isSelected = selectedAccounts.includes(accountId);

          return (
            <button
              key={accountId}
              onClick={() => {
                if (isSelected) {
                  setSelectedAccounts(selectedAccounts.filter((id) => id !== accountId));
                } else {
                  setSelectedAccounts([...selectedAccounts, accountId]);
                }
              }}
              className={`w-full p-4 border rounded-lg text-left transition-all ${
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--neutral-200)] hover:border-[var(--primary)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--primary)]'
                      : 'border-[var(--neutral-300)]'
                  }`}
                >
                  {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{account}</div>
                  <div className="text-sm text-[var(--neutral-600)]">GHS 1,234.56</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--error)]" />
          <p className="text-sm m-0 text-[var(--error)]">{error}</p>
        </div>
      )}

      <Button variant="primary" fullWidth onClick={handleAccountSelection}>
        Continue with {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}
      </Button>
    </div>
  );

  const renderConsent = () => (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <Shield className="w-16 h-16 text-[var(--primary)] mx-auto mb-4" />
        <h2 className="text-2xl mb-2">Review Permissions</h2>
        <p className="text-[var(--neutral-600)]">You're sharing your data with ReshADX Demo App</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 p-4 bg-[var(--neutral-50)] rounded-lg">
          <CheckCircle className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium mb-1">Account Information</div>
            <div className="text-sm text-[var(--neutral-600)]">
              Account numbers, balances, and account holder details
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[var(--neutral-50)] rounded-lg">
          <CheckCircle className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium mb-1">Transaction History</div>
            <div className="text-sm text-[var(--neutral-600)]">Up to 24 months of transaction data</div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[var(--neutral-50)] rounded-lg">
          <CheckCircle className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium mb-1">Identity Verification</div>
            <div className="text-sm text-[var(--neutral-600)]">
              Name, phone number, email, and address
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-lg text-sm">
        <p className="m-0 mb-2">
          By continuing, you agree that ReshADX may share this data with the app.
          You can revoke access anytime.
        </p>
        <button className="text-[var(--primary)] hover:underline">
          Learn more about data sharing
        </button>
      </div>

      <Button variant="primary" fullWidth onClick={handleConsentAccept} disabled={isLoading}>
        {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Agree and Continue'}
      </Button>

      <button onClick={handleExit} className="w-full mt-4 text-center text-[var(--neutral-600)] hover:text-[var(--neutral-900)]">
        Cancel
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="max-w-md mx-auto p-6 text-center">
      <div className="w-20 h-20 bg-[var(--success)]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
        <CheckCircle className="w-12 h-12 text-[var(--success)]" />
      </div>
      <h2 className="text-3xl mb-4">Successfully Connected!</h2>
      <p className="text-lg text-[var(--neutral-600)] mb-6">
        Your {selectedInstitution?.name} account has been linked
      </p>
      <div className="flex items-center justify-center gap-2 text-[var(--neutral-600)]">
        <Loader className="w-5 h-5 animate-spin" />
        <span>Redirecting...</span>
      </div>
    </div>
  );

  const renderUSSDFallback = () => (
    <div className="max-w-md mx-auto p-6">
      <button onClick={() => setCurrentStep('AUTH_METHOD')} className="mb-6 flex items-center gap-2 text-[var(--primary)]">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="text-center mb-8">
        <Phone className="w-16 h-16 text-[var(--success)] mx-auto mb-4" />
        <h2 className="text-2xl mb-2">USSD Connection</h2>
        <p className="text-[var(--neutral-600)]">
          Link your account without internet using USSD
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-6 bg-[var(--neutral-50)] rounded-xl border border-[var(--neutral-200)]">
          <div className="text-sm text-[var(--neutral-600)] mb-2">Step 1: Dial</div>
          <div className="text-3xl font-mono mb-4 text-[var(--success)]">*920*1234#</div>
          <div className="text-sm text-[var(--neutral-600)]">
            on your phone registered with {selectedInstitution?.name}
          </div>
        </div>

        <div className="p-6 bg-[var(--neutral-50)] rounded-xl border border-[var(--neutral-200)]">
          <div className="text-sm text-[var(--neutral-600)] mb-2">Step 2: Follow prompts</div>
          <div className="text-sm">
            Select "Link Account" and enter this code when prompted:
          </div>
          <div className="text-2xl font-mono mt-2 mb-2">{linkSessionId.slice(-6)}</div>
        </div>

        <div className="p-6 bg-[var(--neutral-50)] rounded-xl border border-[var(--neutral-200)]">
          <div className="text-sm text-[var(--neutral-600)] mb-2">Step 3: Complete</div>
          <div className="text-sm">
            You'll receive an SMS confirmation once your account is linked
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2 text-[var(--neutral-600)]">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Waiting for USSD completion...</span>
        </div>
      </div>
    </div>
  );

  const renderOfflineMode = () => (
    <div className="max-w-md mx-auto p-6 text-center">
      <WifiOff className="w-16 h-16 text-[var(--warning)] mx-auto mb-6" />
      <h2 className="text-2xl mb-4">No Internet Connection</h2>
      <p className="text-[var(--neutral-600)] mb-6">
        You can still link your account using USSD without internet
      </p>
      <Button variant="primary" fullWidth onClick={handleUSSDFallback}>
        Use USSD Instead
      </Button>
      <button onClick={handleExit} className="w-full mt-4 text-center text-[var(--neutral-600)] hover:text-[var(--neutral-900)]">
        Cancel
      </button>
    </div>
  );

  // ========== MAIN RENDER ==========

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[var(--neutral-200)] sticky top-0 bg-white z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[var(--primary)]" />
            <span className="font-bold">ReshADX Link</span>
          </div>
          <button onClick={handleExit} className="text-[var(--neutral-600)] hover:text-[var(--neutral-900)]">
            Cancel
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        {currentStep === 'RETURNING_USER' && renderReturningUser()}
        {currentStep === 'SELECT_INSTITUTION' && renderInstitutionSelect()}
        {currentStep === 'AUTH_METHOD' && renderAuthMethod()}
        {currentStep === 'CREDENTIALS' && renderCredentials()}
        {currentStep === 'MFA' && renderMFA()}
        {currentStep === 'ACCOUNT_SELECT' && renderAccountSelect()}
        {currentStep === 'CONSENT' && renderConsent()}
        {currentStep === 'SUCCESS' && renderSuccess()}
        {currentStep === 'USSD_FALLBACK' && renderUSSDFallback()}
        {currentStep === 'OFFLINE_MODE' && renderOfflineMode()}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--neutral-200)] p-4">
        <div className="max-w-md mx-auto text-center text-xs text-[var(--neutral-600)]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span>Secured by ReshADX • Bank-level encryption</span>
          </div>
          <div>
            Your credentials are never stored. <a href="#" className="text-[var(--primary)] hover:underline">Learn more</a>
          </div>
        </div>
      </div>
    </div>
  );
}
