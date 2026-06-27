import { Sparkles } from "lucide-react";

interface SkeletonLoaderProps {
  density?: 'comfortable' | 'compact';
}

export const SkeletonLoader = ({ density = 'comfortable' }: SkeletonLoaderProps) => {
  const lineSpacing = density === 'comfortable' ? 'space-y-4' : 'space-y-2';
  const lineHeight = density === 'comfortable' ? 'h-4' : 'h-3';

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Animated sparkles icon */}
      <div className="relative">
        <Sparkles 
          className="w-12 h-12 text-[#5B8CFF] animate-pulse" 
        />
        <div className="absolute inset-0 bg-[#5B8CFF]/20 rounded-full blur-md animate-pulse"></div>
      </div>

      {/* Shimmer skeleton lines */}
      <div className={`w-full ${lineSpacing}`}>
        <div className={`skeleton-shimmer ${lineHeight} w-3/4 rounded bg-[#1E2433] animate-pulse`}></div>
        <div className={`skeleton-shimmer ${lineHeight} w-full rounded bg-[#1E2433] animate-pulse`}></div>
        <div className={`skeleton-shimmer ${lineHeight} w-5/6 rounded bg-[#1E2433] animate-pulse`}></div>
        <div className={`skeleton-shimmer ${lineHeight} w-2/3 rounded bg-[#1E2433] animate-pulse`}></div>
        <div className={`skeleton-shimmer ${lineHeight} w-4/5 rounded bg-[#1E2433] animate-pulse`}></div>
        <div className={`skeleton-shimmer ${lineHeight} w-1/2 rounded bg-[#1E2433] animate-pulse`}></div>
      </div>

      <div className="text-center">
        <p className="text-sm text-[#9AA4B2] animate-pulse">
          Generating response...
        </p>
      </div>
    </div>
  );
};