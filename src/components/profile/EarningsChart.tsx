import React from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { TrendingUp } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface DailyEarning {
  date: string;
  amount: number;
}

interface EarningsChartProps {
  runHistory: Array<{
    day_id: string;
    earned_amount: number;
    status: string;
  }>;
}

export const EarningsChart: React.FC<EarningsChartProps> = ({ runHistory }) => {
  const { t } = useTranslation();

  // Aggregate earnings by day
  const earningsByDay = React.useMemo(() => {
    const dailyMap = new Map<string, number>();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyMap.set(date, 0);
    }

    // Sum earnings per day
    runHistory.forEach(run => {
      if (run.status === 'completed' && run.earned_amount > 0) {
        const current = dailyMap.get(run.day_id) || 0;
        dailyMap.set(run.day_id, current + run.earned_amount);
      }
    });

    // Convert to array for chart
    const result: DailyEarning[] = [];
    dailyMap.forEach((amount, date) => {
      result.push({ date, amount });
    });

    // Sort by date and take last 7 days
    return result
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }, [runHistory]);

  const totalEarnings = earningsByDay.reduce((sum, day) => sum + day.amount, 0);
  const maxEarning = Math.max(...earningsByDay.map(d => d.amount), 100);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground">
            {format(parseISO(data.date), 'MMM d')}
          </p>
          <div className="flex items-center gap-1">
            <CoinIcon size={14} />
            <span className="font-bold text-sm">{data.amount.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            {t('profile.earnings_chart', 'Daily Earnings')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CoinIcon size={14} />
          <span className="text-sm font-bold">{totalEarnings.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">/ 7d</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={earningsByDay} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => format(parseISO(value), 'd')}
              interval={0}
            />
            <YAxis 
              hide 
              domain={[0, maxEarning * 1.2]} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#earningsGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Day labels */}
      <div className="flex justify-between px-1">
        {earningsByDay.map((day, index) => (
          <div key={day.date} className="text-center">
            <p className="text-[10px] text-muted-foreground">
              {format(parseISO(day.date), 'EEE')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
