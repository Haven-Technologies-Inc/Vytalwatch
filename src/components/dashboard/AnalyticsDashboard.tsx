/**
 * ReshADX Advanced Analytics Dashboard
 * Comprehensive analytics with real-time charts and insights
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, CreditCard,
  Activity, Shield, AlertTriangle, CheckCircle, Clock,
  ArrowUp, ArrowDown, RefreshCw, Download, Calendar, Filter
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../Button';

interface MetricCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
}

interface TransactionData {
  date: string;
  volume: number;
  value: number;
  success: number;
  failed: number;
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface CreditScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface FraudAlert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  user: string;
  amount: number;
  timestamp: string;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [transactionData, setTransactionData] = useState<TransactionData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [creditScoreData, setCreditScoreData] = useState<CreditScoreDistribution[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);

  // Initialize with sample data
  useEffect(() => {
    loadAnalyticsData();

    // Set up real-time updates (every 30 seconds)
    const interval = setInterval(() => {
      loadAnalyticsData();
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);

    // Simulate API call - replace with actual API calls
    await new Promise(resolve => setTimeout(resolve, 500));

    // Metrics
    setMetrics([
      {
        label: 'Transaction Volume',
        value: '2.4M',
        change: '+18.2%',
        trend: 'up',
        icon: Activity,
        color: 'text-[#06B6D4]'
      },
      {
        label: 'Total Revenue',
        value: '$284,950',
        change: '+15.7%',
        trend: 'up',
        icon: DollarSign,
        color: 'text-[#10B981]'
      },
      {
        label: 'Active Users',
        value: '127,453',
        change: '+12.5%',
        trend: 'up',
        icon: Users,
        color: 'text-[#7C3AED]'
      },
      {
        label: 'Avg Credit Score',
        value: '682',
        change: '+3.2%',
        trend: 'up',
        icon: CreditCard,
        color: 'text-[#F59E0B]'
      },
      {
        label: 'Fraud Detection Rate',
        value: '99.4%',
        change: '+0.3%',
        trend: 'up',
        icon: Shield,
        color: 'text-[#EF4444]'
      },
      {
        label: 'API Success Rate',
        value: '99.6%',
        change: '+0.2%',
        trend: 'up',
        icon: CheckCircle,
        color: 'text-[#10B981]'
      }
    ]);

    // Transaction volume over time
    setTransactionData([
      { date: 'Nov 08', volume: 32450, value: 18500, success: 32100, failed: 350 },
      { date: 'Nov 09', volume: 35600, value: 21200, success: 35250, failed: 350 },
      { date: 'Nov 10', volume: 38200, value: 23400, success: 37850, failed: 350 },
      { date: 'Nov 11', volume: 42800, value: 28900, success: 42400, failed: 400 },
      { date: 'Nov 12', volume: 45300, value: 31200, success: 44900, failed: 400 },
      { date: 'Nov 13', volume: 48900, value: 34500, success: 48450, failed: 450 },
      { date: 'Nov 14', volume: 52100, value: 38700, success: 51600, failed: 500 },
    ]);

    // Transaction categories
    setCategoryData([
      { name: 'Mobile Money', value: 35, percentage: 35, color: '#06B6D4' },
      { name: 'Bank Transfer', value: 28, percentage: 28, color: '#7C3AED' },
      { name: 'Card Payment', value: 18, percentage: 18, color: '#F59E0B' },
      { name: 'Airtime', value: 12, percentage: 12, color: '#10B981' },
      { name: 'Bill Payment', value: 7, percentage: 7, color: '#EF4444' },
    ]);

    // Credit score distribution
    setCreditScoreData([
      { range: '300-499 (Poor)', count: 8234, percentage: 6.5 },
      { range: '500-579 (Fair)', count: 15678, percentage: 12.3 },
      { range: '580-669 (Good)', count: 38456, percentage: 30.2 },
      { range: '670-749 (Very Good)', count: 42890, percentage: 33.6 },
      { range: '750-850 (Excellent)', count: 22195, percentage: 17.4 },
    ]);

    // Fraud alerts
    setFraudAlerts([
      {
        id: 'FA-2024-001',
        type: 'SIM Swap Detected',
        severity: 'CRITICAL',
        user: '+233501234567',
        amount: 5000,
        timestamp: '2 mins ago',
        status: 'PENDING'
      },
      {
        id: 'FA-2024-002',
        type: 'Unusual Transaction Pattern',
        severity: 'HIGH',
        user: '+234801234567',
        amount: 3500,
        timestamp: '15 mins ago',
        status: 'INVESTIGATING'
      },
      {
        id: 'FA-2024-003',
        type: 'Velocity Check Failed',
        severity: 'MEDIUM',
        user: '+254701234567',
        amount: 1200,
        timestamp: '1 hour ago',
        status: 'INVESTIGATING'
      },
      {
        id: 'FA-2024-004',
        type: 'Geolocation Anomaly',
        severity: 'LOW',
        user: '+27821234567',
        amount: 850,
        timestamp: '3 hours ago',
        status: 'RESOLVED'
      },
    ]);

    // Revenue by day
    setRevenueData([
      { date: 'Nov 08', revenue: 38500, apiCalls: 245000, businesses: 42 },
      { date: 'Nov 09', revenue: 41200, apiCalls: 268000, businesses: 48 },
      { date: 'Nov 10', revenue: 39800, apiCalls: 252000, businesses: 45 },
      { date: 'Nov 11', revenue: 43500, apiCalls: 289000, businesses: 52 },
      { date: 'Nov 12', revenue: 45200, apiCalls: 301000, businesses: 55 },
      { date: 'Nov 13', revenue: 48900, apiCalls: 324000, businesses: 61 },
      { date: 'Nov 14', revenue: 52100, apiCalls: 342000, businesses: 68 },
    ]);

    // User growth
    setUserGrowthData([
      { date: 'Nov 08', individual: 123450, business: 2789, total: 126239 },
      { date: 'Nov 09', individual: 123890, business: 2801, total: 126691 },
      { date: 'Nov 10', individual: 124320, business: 2815, total: 127135 },
      { date: 'Nov 11', individual: 125100, business: 2828, total: 127928 },
      { date: 'Nov 12', individual: 125890, business: 2835, total: 128725 },
      { date: 'Nov 13', individual: 126780, business: 2842, total: 129622 },
      { date: 'Nov 14', individual: 127453, business: 2847, total: 130300 },
    ]);

    setLoading(false);
  };

  const COLORS = {
    primary: '#06B6D4',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#7C3AED',
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30';
      case 'HIGH': return 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30';
      case 'MEDIUM': return 'bg-[#FCD34D]/20 text-[#FCD34D] border-[#FCD34D]/30';
      case 'LOW': return 'bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-[#F59E0B]';
      case 'INVESTIGATING': return 'text-[#06B6D4]';
      case 'RESOLVED': return 'text-[#10B981]';
      case 'FALSE_POSITIVE': return 'text-white/60';
      default: return 'text-white/60';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl md:text-3xl mb-2">Advanced Analytics</h1>
          <p className="text-white/60">Real-time insights and performance metrics</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-1">
            {['24h', '7d', '30d', '90d'].map((range) => (
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

          <Button variant="secondary" size="sm" onClick={loadAnalyticsData}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button variant="secondary" size="sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Export</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? ArrowUp : ArrowDown;
          return (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:border-[#06B6D4]/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${metric.color}`} />
                <span className={`flex items-center gap-1 text-xs ${
                  metric.trend === 'up' ? 'text-[#10B981]' : 'text-[#EF4444]'
                }`}>
                  <TrendIcon className="w-3 h-3" />
                  {metric.change}
                </span>
              </div>
              <div className="text-white text-xl md:text-2xl mb-1">{metric.value}</div>
              <div className="text-white/60 text-xs">{metric.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Transaction Volume Chart */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white text-lg mb-1">Transaction Volume</h3>
              <p className="text-white/60 text-sm">Daily transaction trends</p>
            </div>
            <Activity className="w-5 h-5 text-[#06B6D4]" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={transactionData}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="date" stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#06B6D4"
                strokeWidth={2}
                fill="url(#colorVolume)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Value Chart */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white text-lg mb-1">Transaction Value (GHS '000)</h3>
              <p className="text-white/60 text-sm">Monetary value trends</p>
            </div>
            <DollarSign className="w-5 h-5 text-[#10B981]" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={transactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="date" stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10B981"
                strokeWidth={2}
                name="Value"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Transaction Categories */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white text-lg mb-1">Transaction Categories</h3>
              <p className="text-white/60 text-sm">Distribution by type</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #ffffff20',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-2">
            {categoryData.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-white/70 text-sm">{category.name}</span>
                </div>
                <span className="text-white text-sm">{category.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Score Distribution */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white text-lg mb-1">Credit Score Distribution</h3>
              <p className="text-white/60 text-sm">User creditworthiness spread</p>
            </div>
            <CreditCard className="w-5 h-5 text-[#F59E0B]" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={creditScoreData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis type="number" stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <YAxis
                dataKey="range"
                type="category"
                stroke="#ffffff60"
                style={{ fontSize: '10px' }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="count" fill="#F59E0B" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Analytics */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white text-lg mb-1">Revenue & API Usage</h3>
              <p className="text-white/60 text-sm">Daily revenue and API calls</p>
            </div>
            <TrendingUp className="w-5 h-5 text-[#10B981]" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="date" stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                name="Revenue ($)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white text-lg mb-1">User Growth</h3>
              <p className="text-white/60 text-sm">Individual & business accounts</p>
            </div>
            <Users className="w-5 h-5 text-[#7C3AED]" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="date" stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="individual"
                stroke="#7C3AED"
                strokeWidth={2}
                name="Individual Users"
              />
              <Line
                type="monotone"
                dataKey="business"
                stroke="#06B6D4"
                strokeWidth={2}
                name="Business Accounts"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fraud Detection Alerts */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#EF4444]" />
            <h3 className="text-white text-lg">Real-time Fraud Alerts</h3>
            <span className="px-2 py-0.5 bg-[#EF4444] text-white text-xs rounded-full">
              {fraudAlerts.filter(a => a.status === 'PENDING').length} pending
            </span>
          </div>
          <Button variant="secondary" size="sm">
            View All
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-white/60 text-sm">Alert ID</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm">Type</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm">Severity</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm">User</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm">Amount</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm">Status</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm">Time</th>
              </tr>
            </thead>
            <tbody>
              {fraudAlerts.map((alert) => (
                <tr key={alert.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <code className="text-white/70 text-sm">{alert.id}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white text-sm">{alert.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-white/70 text-sm">{alert.user}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white text-sm">GHS {(alert.amount / 100).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-sm ${getStatusColor(alert.status)}`}>
                      {alert.status === 'PENDING' && <Clock className="w-4 h-4" />}
                      {alert.status === 'INVESTIGATING' && <Activity className="w-4 h-4" />}
                      {alert.status === 'RESOLVED' && <CheckCircle className="w-4 h-4" />}
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/50 text-sm">{alert.timestamp}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
