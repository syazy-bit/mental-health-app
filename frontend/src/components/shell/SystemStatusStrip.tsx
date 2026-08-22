import React from 'react';

export const SystemStatusStrip: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-1">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2 rounded-2xl bg-[#FAF8F5]/80 dark:bg-[#16221D]/80 border border-[#ECE6DC] dark:border-[#263830] text-[11px] sm:text-xs text-[#50655D] dark:text-[#A3B8AF] shadow-2xs">
        {/* Left Status: Operational & Anonymous Gateway */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
          </span>
          <span className="font-semibold text-[#1C362B] dark:text-[#E2EBE5]">System Operational</span>
          <span className="text-[#B8C4BE] dark:text-[#455A52]">&bull;</span>
          <span>Zero-Trace Anonymous Gateway Active</span>
        </div>

        {/* Right Status: Safety Engine & 24/7 Availability */}
        <div className="flex items-center gap-2">
          <span>Safety Engine: <strong className="font-medium text-[#1C362B] dark:text-[#E2EBE5]">Deterministic v1.0</strong></span>
          <span className="text-[#B8C4BE] dark:text-[#455A52]">&bull;</span>
          <span>Availability: <strong className="font-medium text-[#1C362B] dark:text-[#E2EBE5]">24/7</strong></span>
        </div>
      </div>
    </div>
  );
};
