import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Building2, TrendingUp, DollarSign,
  Activity, Database, Shield, Settings, Bell, Search,
  Filter, Download, RefreshCw, ChevronDown, ChevronRight,
  BarChart3, PieChart, Calendar, Clock, CheckCircle,
  XCircle, AlertTriangle, Info, Menu, X, Eye, UserCheck,
  CreditCard, Globe, Server, Zap, Lock, Key, FileText,
  Mail, Phone, MapPin, ExternalLink, Edit, Trash2, Plus,
  ArrowUp, ArrowDown, Minus, Package, Layers, Code,
  Webhook, Terminal, BookOpen, MessageSquare, HelpCircle,
  Ban, Play, Pause, RotateCcw, LogOut, Crown, Star, User
} from 'lucide-react';
import { Button } from '../Button';
import { AnalyticsDashboard } from './AnalyticsDashboard';

type TabType = 'overview' | 'users' | 'businesses' | 'analytics' | 'revenue' | 'api-health' | 'security' | 'support' | 'settings';

export function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState<TabType>('overview');
  const [showMenu, setShowMenu] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Platform Stats
  const platformStats = {
    totalUsers: {
      value: '127,453',
      change: '+12.5%',
      trend: 'up',
      label: 'Total Users'
    },
    activeBusinesses: {
      value: '2,847',
      change: '+8.3%',
      trend: 'up',
      label: 'Active Businesses'
    },
    apiCalls: {
      value: '45.2M',
      change: '+23.1%',
      trend: 'up',
      label: 'API Calls (30d)'
    },
    revenue: {
      value: '$284,950',
      change: '+15.7%',
      trend: 'up',
      label: 'Monthly Revenue'
    },
    successRate: {
      value: '99.6%',
      change: '+0.2%',
      trend: 'up',
      label: 'API Success Rate'
    },
    avgResponse: {
      value: '187ms',
      change: '-12ms',
      trend: 'up',
      label: 'Avg Response Time'
    }
  };

  // Recent Businesses
  const recentBusinesses = [
    { id: 1, name: 'FinTech Solutions Ltd', email: 'contact@fintech.gh', country: 'Ghana', plan: 'Enterprise', status: 'active', joined: '2 hours ago', apiCalls: '12.5K', revenue: '$2,450' },
    { id: 2, name: 'PayNow Services', email: 'info@paynow.ng', country: 'Nigeria', plan: 'Professional', status: 'active', joined: '5 hours ago', apiCalls: '8.3K', revenue: '$890' },
    { id: 3, name: 'LendMe App', email: 'support@lendme.ke', country: 'Kenya', plan: 'Professional', status: 'active', joined: '1 day ago', apiCalls: '15.2K', revenue: '$1,230' },
    { id: 4, name: 'BankConnect SA', email: 'admin@bankconnect.za', country: 'South Africa', plan: 'Enterprise', status: 'pending', joined: '1 day ago', apiCalls: '0', revenue: '$0' },
    { id: 5, name: 'MobiCash UG', email: 'hello@mobicash.ug', country: 'Uganda', plan: 'Starter', status: 'active', joined: '2 days ago', apiCalls: '2.1K', revenue: '$180' },
  ];

  // Individual Users
  const recentUsers = [
    { id: 1, name: 'Kwame Mensah', phone: '+233501234567', country: 'Ghana', verified: true, accounts: 3, apps: 5, joined: '3 days ago' },
    { id: 2, name: 'Amara Okafor', phone: '+234801234567', country: 'Nigeria', verified: true, accounts: 2, apps: 3, joined: '5 days ago' },
    { id: 3, name: 'Sarah Mwangi', phone: '+254701234567', country: 'Kenya', verified: true, accounts: 4, apps: 7, joined: '1 week ago' },
    { id: 4, name: 'Thabo Nkosi', phone: '+27821234567', country: 'South Africa', verified: false, accounts: 0, apps: 0, joined: '2 weeks ago' },
    { id: 5, name: 'Fatima Hassan', phone: '+221761234567', country: 'Senegal', verified: true, accounts: 2, apps: 4, joined: '3 weeks ago' },
  ];

  // API Health
  const apiEndpoints = [
    { name: '/v1/identity/verify', calls: '15.2M', success: '99.8%', avg: '145ms', status: 'healthy' },
    { name: '/v1/accounts/link', calls: '8.7M', success: '99.5%', avg: '234ms', status: 'healthy' },
    { name: '/v1/biometric/scan', calls: '6.3M', success: '98.9%', avg: '456ms', status: 'warning' },
    { name: '/v1/transactions/fetch', calls: '12.1M', success: '99.7%', avg: '189ms', status: 'healthy' },
    { name: '/v1/consent/manage', calls: '4.5M', success: '99.9%', avg: '98ms', status: 'healthy' },
  ];

  // Support Tickets
  const supportTickets = [
    { id: 1, business: 'FinTech Solutions Ltd', subject: 'API rate limit issue', priority: 'high', status: 'open', time: '10 mins ago' },
    { id: 2, business: 'PayNow Services', subject: 'Integration documentation request', priority: 'medium', status: 'in-progress', time: '2 hours ago' },
    { id: 3, business: 'LendMe App', subject: 'Webhook not triggering', priority: 'high', status: 'open', time: '5 hours ago' },
    { id: 4, business: 'BankConnect SA', subject: 'Account verification pending', priority: 'low', status: 'resolved', time: '1 day ago' },
    { id: 5, business: 'MobiCash UG', subject: 'Billing question', priority: 'medium', status: 'in-progress', time: '2 days ago' },
  ];

  // Revenue by Country
  const revenueByCountry = [
    { country: 'Nigeria', flag: '🇳🇬', revenue: '$89,450', businesses: 847, percentage: 31.4 },
    { country: 'Ghana', flag: '🇬🇭', revenue: '$67,230', businesses: 623, percentage: 23.6 },
    { country: 'Kenya', flag: '🇰🇪', revenue: '$54,890', businesses: 512, percentage: 19.3 },
    { country: 'South Africa', flag: '🇿🇦', revenue: '$45,670', businesses: 428, percentage: 16.0 },
    { country: 'Uganda', flag: '🇺🇬', revenue: '$27,710', businesses: 437, percentage: 9.7 },
  ];

  // Security Events
  const securityEvents = [
    { id: 1, event: 'Failed login attempt', severity: 'medium', user: 'admin@reshadx.com', ip: '102.88.34.12', time: '5 mins ago' },
    { id: 2, event: 'New API key generated', severity: 'low', user: 'FinTech Solutions Ltd', ip: '197.255.123.45', time: '15 mins ago' },
    { id: 3, event: 'Suspicious activity detected', severity: 'high', user: 'Unknown', ip: '41.202.76.89', time: '1 hour ago' },
    { id: 4, event: 'Rate limit exceeded', severity: 'medium', user: 'PayNow Services', ip: '105.112.34.56', time: '3 hours ago' },
    { id: 5, event: 'Webhook endpoint failed', severity: 'low', user: 'LendMe App', ip: '154.123.45.67', time: '6 hours ago' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2540] via-[#1E293B] to-[#0F172A]">
      {/* Top Navigation */}
      <div className="bg-white/5 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-8">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="xl:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {showMenu ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#F59E0B] to-[#EF4444] rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold">ReshADX</span>
                  <span className="ml-2 px-2 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] text-xs rounded border border-[#F59E0B]/30">
                    Admin
                  </span>
                </div>
              </div>

              <nav className="hidden xl:flex items-center gap-4">
                <button
                  onClick={() => setSelectedTab('overview')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedTab === 'overview' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-sm">Overview</span>
                </button>
                <button
                  onClick={() => setSelectedTab('users')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedTab === 'users' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Users</span>
                </button>
                <button
                  onClick={() => setSelectedTab('businesses')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedTab === 'businesses' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">Businesses</span>
                </button>
                <button
                  onClick={() => setSelectedTab('analytics')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedTab === 'analytics' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Analytics</span>
                </button>
                <button
                  onClick={() => setSelectedTab('revenue')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedTab === 'revenue' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Revenue</span>
                </button>
                <button
                  onClick={() => setSelectedTab('api-health')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedTab === 'api-health' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">API Health</span>
                </button>
                <button
                  onClick={() => setSelectedTab('security')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedTab === 'security' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Security</span>
                </button>
                <button
                  onClick={() => setSelectedTab('support')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors relative ${
                    selectedTab === 'support' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Support</span>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#EF4444] text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="hidden md:flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-1">
                {['24h', '7d', '30d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-1.5 rounded text-xs transition-all ${
                      dateRange === range
                        ? 'bg-[#06B6D4] text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-white/70" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full" />
              </button>

              <button
                onClick={() => setSelectedTab('settings')}
                className="hidden md:block p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-white/70" />
              </button>

              <div className="w-9 h-9 bg-gradient-to-br from-[#F59E0B] to-[#EF4444] rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="xl:hidden bg-white/5 backdrop-blur-lg border-b border-white/10">
          <nav className="px-4 py-4 space-y-2">
            {[
              { key: 'overview', icon: LayoutDashboard, label: 'Overview' },
              { key: 'users', icon: Users, label: 'Users' },
              { key: 'businesses', icon: Building2, label: 'Businesses' },
              { key: 'analytics', icon: BarChart3, label: 'Analytics' },
              { key: 'revenue', icon: DollarSign, label: 'Revenue' },
              { key: 'api-health', icon: Activity, label: 'API Health' },
              { key: 'security', icon: Shield, label: 'Security' },
              { key: 'support', icon: MessageSquare, label: 'Support' },
              { key: 'settings', icon: Settings, label: 'Settings' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedTab(key as TabType);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <h1 className="text-white text-2xl md:text-3xl mb-2">Platform Overview</h1>
              <p className="text-white/60">Monitor and manage your entire ReshADX infrastructure</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 mb-6 md:mb-8">
              {Object.entries(platformStats).map(([key, stat]) => (
                <div key={key} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:border-[#06B6D4]/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-xs">{stat.label}</span>
                    <span className={`flex items-center gap-1 text-xs ${
                      stat.trend === 'up' ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {stat.change}
                    </span>
                  </div>
                  <div className="text-white text-xl md:text-2xl">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
              {/* Recent Businesses */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#06B6D4]" />
                    <h3 className="text-white m-0">Recent Businesses</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTab('businesses')}
                    className="text-[#06B6D4] text-sm hover:underline flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {recentBusinesses.slice(0, 5).map((business) => (
                    <div key={business.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-lg hover:bg-white/5 transition-all">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#06B6D4] to-[#0891B2] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-white text-sm truncate">{business.name}</div>
                          <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                            business.status === 'active'
                              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                              : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                          }`}>
                            {business.status}
                          </span>
                        </div>
                        <div className="text-white/50 text-xs">{business.country} • {business.joined}</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-white text-sm">{business.apiCalls}</div>
                        <div className="text-white/50 text-xs">API calls</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Health Status */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#10B981]" />
                    <h3 className="text-white m-0">API Health</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTab('api-health')}
                    className="text-[#06B6D4] text-sm hover:underline flex items-center gap-1"
                  >
                    Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {apiEndpoints.slice(0, 5).map((endpoint, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-lg">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        endpoint.status === 'healthy' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <code className="text-white text-sm block truncate">{endpoint.name}</code>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-white/50 text-xs">{endpoint.calls} calls</span>
                          <span className="text-white/30 text-xs">•</span>
                          <span className="text-[#10B981] text-xs">{endpoint.success}</span>
                        </div>
                      </div>
                      <div className="text-white/60 text-xs hidden md:block">{endpoint.avg}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue by Country & Support Tickets */}
            <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
              {/* Revenue by Country */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#06B6D4]" />
                    <h3 className="text-white m-0">Revenue by Country</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTab('revenue')}
                    className="text-[#06B6D4] text-sm hover:underline flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {revenueByCountry.map((country, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-lg">
                      <span className="text-2xl flex-shrink-0">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white text-sm">{country.country}</div>
                          <div className="text-white text-sm">{country.revenue}</div>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#06B6D4] to-[#7C3AED]"
                            style={{ width: `${country.percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-white/50 text-xs">{country.businesses} businesses</div>
                          <div className="text-white/50 text-xs">{country.percentage}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Tickets */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#06B6D4]" />
                    <h3 className="text-white m-0">Support Tickets</h3>
                    <span className="px-2 py-0.5 bg-[#EF4444] text-white text-xs rounded-full">
                      3 open
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTab('support')}
                    className="text-[#06B6D4] text-sm hover:underline flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {supportTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-start gap-3 p-3 bg-black/40 border border-white/10 rounded-lg hover:bg-white/5 transition-all cursor-pointer">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        ticket.status === 'open' ? 'bg-[#EF4444]' :
                        ticket.status === 'in-progress' ? 'bg-[#F59E0B]' :
                        'bg-[#10B981]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-white text-sm truncate">{ticket.subject}</div>
                          <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                            ticket.priority === 'high' ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' :
                            ticket.priority === 'medium' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30' :
                            'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <div className="text-white/50 text-xs">{ticket.business} • {ticket.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {selectedTab === 'users' && (
          <div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-white text-2xl md:text-3xl mb-2">Individual Users</h1>
                <p className="text-white/60">Manage all registered individual users</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Export</span>
                </Button>
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Add User</span>
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              {[
                { label: 'Total Users', value: '127,453', icon: Users, color: 'text-[#06B6D4]', bgColor: 'bg-[#06B6D4]/20' },
                { label: 'Verified', value: '98,234', icon: CheckCircle, color: 'text-[#10B981]', bgColor: 'bg-[#10B981]/20' },
                { label: 'Active (30d)', value: '84,567', icon: Activity, color: 'text-[#7C3AED]', bgColor: 'bg-[#7C3AED]/20' },
                { label: 'New Today', value: '234', icon: TrendingUp, color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B]/20' },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                    <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="text-white text-2xl mb-1">{stat.value}</div>
                    <div className="text-white/60 text-sm">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Users Table */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
                <div className="relative flex-1 w-full md:max-w-sm">
                  <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-white/40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                    <Filter className="w-4 h-4 text-white/60" />
                  </button>
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-white/60 text-sm">User</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Phone</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Country</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Status</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Accounts</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Apps</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Joined</th>
                      <th className="px-4 py-3 text-right text-white/60 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-white text-sm">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-white/70 text-sm">{user.phone}</code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/70 text-sm">{user.country}</span>
                        </td>
                        <td className="px-4 py-3">
                          {user.verified ? (
                            <span className="flex items-center gap-1 text-[#10B981] text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#F59E0B] text-sm">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/70 text-sm">{user.accounts}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/70 text-sm">{user.apps}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/50 text-sm">{user.joined}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                              <Eye className="w-4 h-4 text-white/60" />
                            </button>
                            <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                              <Edit className="w-4 h-4 text-white/60" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Businesses Tab */}
        {selectedTab === 'businesses' && (
          <div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-white text-2xl md:text-3xl mb-2">Business Accounts</h1>
                <p className="text-white/60">Manage companies integrating ReshADX</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Export</span>
                </Button>
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Add Business</span>
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              {[
                { label: 'Total Businesses', value: '2,847', icon: Building2, color: 'text-[#06B6D4]', bgColor: 'bg-[#06B6D4]/20' },
                { label: 'Active', value: '2,634', icon: CheckCircle, color: 'text-[#10B981]', bgColor: 'bg-[#10B981]/20' },
                { label: 'Enterprise', value: '234', icon: Crown, color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B]/20' },
                { label: 'New This Month', value: '89', icon: TrendingUp, color: 'text-[#7C3AED]', bgColor: 'bg-[#7C3AED]/20' },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                    <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="text-white text-2xl mb-1">{stat.value}</div>
                    <div className="text-white/60 text-sm">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Businesses Table */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
                <div className="relative flex-1 w-full md:max-w-sm">
                  <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search businesses..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-white/40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                    <Filter className="w-4 h-4 text-white/60" />
                  </button>
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Business</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Email</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Country</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Plan</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Status</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">API Calls</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Revenue</th>
                      <th className="px-4 py-3 text-right text-white/60 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBusinesses.map((business) => (
                      <tr key={business.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#06B6D4] to-[#0891B2] rounded-lg flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-white text-sm">{business.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/70 text-sm">{business.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/70 text-sm">{business.country}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            business.plan === 'Enterprise'
                              ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                              : business.plan === 'Professional'
                              ? 'bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30'
                              : 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30'
                          }`}>
                            {business.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-sm ${
                            business.status === 'active' ? 'text-[#10B981]' : 'text-[#F59E0B]'
                          }`}>
                            {business.status === 'active' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                            {business.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/70 text-sm">{business.apiCalls}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white text-sm">{business.revenue}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                              <Eye className="w-4 h-4 text-white/60" />
                            </button>
                            <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                              <Edit className="w-4 h-4 text-white/60" />
                            </button>
                            <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                              <Ban className="w-4 h-4 text-[#EF4444]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {selectedTab === 'security' && (
          <div>
            <div className="mb-6 md:mb-8">
              <h1 className="text-white text-2xl md:text-3xl mb-2">Security & Compliance</h1>
              <p className="text-white/60">Monitor security events and manage access controls</p>
            </div>

            {/* Security Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              {[
                { label: 'Security Events', value: '234', icon: Shield, color: 'text-[#EF4444]', bgColor: 'bg-[#EF4444]/20' },
                { label: 'Failed Logins', value: '12', icon: XCircle, color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B]/20' },
                { label: 'Active Sessions', value: '2,847', icon: Activity, color: 'text-[#10B981]', bgColor: 'bg-[#10B981]/20' },
                { label: 'Blocked IPs', value: '45', icon: Ban, color: 'text-[#06B6D4]', bgColor: 'bg-[#06B6D4]/20' },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                    <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="text-white text-2xl mb-1">{stat.value}</div>
                    <div className="text-white/60 text-sm">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Security Events */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#EF4444]" />
                  <h3 className="text-white m-0">Recent Security Events</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                    <Filter className="w-4 h-4 text-white/60" />
                  </button>
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Event</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Severity</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">User/Business</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">IP Address</th>
                      <th className="px-4 py-3 text-left text-white/60 text-sm">Time</th>
                      <th className="px-4 py-3 text-right text-white/60 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityEvents.map((event) => (
                      <tr key={event.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <span className="text-white text-sm">{event.event}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-sm ${
                            event.severity === 'high' ? 'text-[#EF4444]' :
                            event.severity === 'medium' ? 'text-[#F59E0B]' :
                            'text-[#06B6D4]'
                          }`}>
                            {event.severity === 'high' ? <AlertTriangle className="w-4 h-4" /> :
                             event.severity === 'medium' ? <Info className="w-4 h-4" /> :
                             <CheckCircle className="w-4 h-4" />}
                            {event.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/70 text-sm">{event.user}</span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-white/70 text-sm">{event.ip}</code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white/50 text-sm">{event.time}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                              <Eye className="w-4 h-4 text-white/60" />
                            </button>
                            <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                              <Ban className="w-4 h-4 text-[#EF4444]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab - Full Dashboard */}
        {selectedTab === 'analytics' && <AnalyticsDashboard />}

        {selectedTab === 'revenue' && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-white text-xl mb-2">Revenue Management</h2>
            <p className="text-white/60">Revenue tracking and billing coming soon</p>
          </div>
        )}

        {selectedTab === 'api-health' && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-white text-xl mb-2">API Health Monitoring</h2>
            <p className="text-white/60">Real-time API health dashboard coming soon</p>
          </div>
        )}

        {selectedTab === 'support' && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-white text-xl mb-2">Support Center</h2>
            <p className="text-white/60">Ticket management system coming soon</p>
          </div>
        )}

        {selectedTab === 'settings' && (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-white text-xl mb-2">Platform Settings</h2>
            <p className="text-white/60">System configuration coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}