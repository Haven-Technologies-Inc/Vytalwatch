'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const COLORS = ['#0066FF', '#00C48C', '#FF6B6B', '#FFA726', '#8B5CF6', '#EC4899'];

interface BaseChartProps {
  data: any[];
  height?: number;
  className?: string;
}

export interface TrendChartProps extends BaseChartProps {
  xKey?: string;
  yKey?: string;
  type?: 'line' | 'area';
  color?: string;
  showGrid?: boolean;
  referenceLines?: Array<{ y: number; label: string; color: string }>;
  normalRange?: { min: number; max: number };
}

export function TrendChart({
  data,
  xKey = 'name',
  yKey = 'value',
  type = 'line',
  color = '#0066FF',
  height = 300,
  showGrid = true,
  referenceLines = [],
  normalRange,
  className,
}: TrendChartProps) {
  const Chart = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          />
          {normalRange && (
            <ReferenceLine
              y={normalRange.max}
              stroke="#FFA726"
              strokeDasharray="5 5"
              label={{ value: 'High', position: 'right', fontSize: 10, fill: '#FFA726' }}
            />
          )}
          {normalRange && (
            <ReferenceLine
              y={normalRange.min}
              stroke="#FFA726"
              strokeDasharray="5 5"
              label={{ value: 'Low', position: 'right', fontSize: 10, fill: '#FFA726' }}
            />
          )}
          {referenceLines.map((line, index) => (
            <ReferenceLine
              key={index}
              y={line.y}
              stroke={line.color}
              strokeDasharray="5 5"
              label={{ value: line.label, position: 'right', fontSize: 10, fill: line.color }}
            />
          ))}
          {type === 'area' ? (
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ) : (
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

interface MultiLineChartProps extends BaseChartProps {
  xKey: string;
  lines: Array<{ key: string; label: string; color: string }>;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function MultiLineChart({
  data,
  xKey,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  className,
}: MultiLineChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          />
          {showLegend && <Legend />}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 0, r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarChartProps extends BaseChartProps {
  xKey: string;
  yKey: string;
  color?: string;
  horizontal?: boolean;
}

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  color = '#0066FF',
  height = 300,
  horizontal = false,
  className,
}: BarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 10, left: horizontal ? 60 : -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis dataKey={xKey} type="category" tick={{ fontSize: 12, fill: '#6B7280' }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface DonutChartProps extends BaseChartProps {
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showLabel?: boolean;
}

export function DonutChart({
  data,
  dataKey = 'value',
  nameKey = 'name',
  colors = COLORS,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  showLabel = true,
  className,
}: DonutChartProps) {
  const safeData = Array.isArray(data) ? data : [];
  const total = useMemo(() => safeData.reduce((sum, item) => sum + item[dataKey], 0), [safeData, dataKey]);

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={safeData}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            label={showLabel ? ({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%` : false}
            labelLine={showLabel}
          >
            {safeData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RiskScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  className?: string;
}

export function RiskScoreGauge({
  score,
  maxScore = 100,
  size = 200,
  className,
}: RiskScoreGaugeProps) {
  const percentage = (score / maxScore) * 100;
  const strokeDashoffset = 283 - (283 * percentage) / 100;

  const getColor = (pct: number) => {
    if (pct < 30) return '#00C48C';
    if (pct < 70) return '#FFA726';
    return '#FF6B6B';
  };

  const getLabel = (pct: number) => {
    if (pct < 30) return 'Low Risk';
    if (pct < 70) return 'Moderate Risk';
    return 'High Risk';
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={size} height={size / 2 + 20} viewBox="0 0 120 80">
        <path
          d="M 10 70 A 50 50 0 0 1 110 70"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 10 70 A 50 50 0 0 1 110 70"
          fill="none"
          stroke={getColor(percentage)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="157"
          strokeDashoffset={157 - (157 * percentage) / 100}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={getColor(percentage)}
        >
          {score}
        </text>
        <text x="60" y="72" textAnchor="middle" className="text-xs" fill="#6B7280">
          {getLabel(percentage)}
        </text>
      </svg>
    </div>
  );
}
