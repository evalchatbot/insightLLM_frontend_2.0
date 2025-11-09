import { type FC } from 'react';

interface Usage {
  tokens_input: number | null;
  tokens_output: number | null;
  period_start: string;
}

interface Limits {
  input_tokens: number | null;
  output_tokens: number | null;
}

interface UsageDisplayProps {
  usage: Usage;
  limits: Limits;
}

export const UsageDisplay: FC<UsageDisplayProps> = ({ usage, limits }) => {
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    const safeNum = Number(num);
    if (isNaN(safeNum)) return '0';
    if (safeNum >= 1000000) {
      return `${(safeNum / 1000000).toFixed(1)}M`;
    }
    if (safeNum >= 1000) {
      return `${(safeNum / 1000).toFixed(1)}K`;
    }
    return Math.round(safeNum).toString(); // Round to whole numbers
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'Invalid Date';
    }
  };

  const getUsagePercentage = (used: number | null | undefined, limit: number | null | undefined): number => {
    const safeUsed = Number(used) || 0;
    const safeLimit = Number(limit) || 1; // Prevent division by zero
    return Math.min(Math.round((safeUsed / safeLimit) * 100), 100);
  };

  const inputPercentage = getUsagePercentage(usage.tokens_input, limits.input_tokens);
  const outputPercentage = getUsagePercentage(usage.tokens_output, limits.output_tokens);

  return (
    <div className="space-y-6 p-6 rounded-xl bg-[#231f31] shadow-2xl border border-purple-900/30 backdrop-blur-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-400"></div>
            <span className="font-semibold text-sm text-purple-100">Input Tokens</span>
          </div>
          <span className="font-mono text-sm text-purple-200 font-medium">
            {formatNumber(usage.tokens_input)} / {formatNumber(limits.input_tokens)}
          </span>
        </div>
        <div className="w-full bg-purple-900/30 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className={`h-3 rounded-full transition-all duration-500 relative overflow-hidden ${
              inputPercentage >= 90 ? 'bg-red-500' : inputPercentage >= 70 ? 'bg-yellow-500' : 'bg-purple-500'
            }`}
            style={{
              width: `${inputPercentage}%`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 opacity-80" />
          </div>
        </div>
        <div className="text-xs text-purple-300/60 text-right">
          {inputPercentage}% used
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
            <span className="font-semibold text-sm text-purple-100">Output Tokens</span>
          </div>
          <span className="font-mono text-sm text-purple-200 font-medium">
            {formatNumber(usage.tokens_output)} / {formatNumber(limits.output_tokens)}
          </span>
        </div>
        <div className="w-full bg-indigo-900/30 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className={`h-3 rounded-full transition-all duration-500 relative overflow-hidden ${
              outputPercentage >= 90 ? 'bg-red-500' : outputPercentage >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'
            }`}
            style={{
              width: `${outputPercentage}%`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 opacity-80" />
          </div>
        </div>
        <div className="text-xs text-purple-300/60 text-right">
          {outputPercentage}% used
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-purple-800/40">
        <div className="flex items-center justify-between text-xs">
          <span className="text-purple-300/70 font-medium">Billing Period</span>
          <span className="text-purple-200 font-mono">
            {formatDate(usage.period_start)}
          </span>
        </div>
      </div>
    </div>
  );
};