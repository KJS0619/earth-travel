'use client';

import dynamic from 'next/dynamic';

const EarthTravel = dynamic(() => import('@/components/EarthTravel'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <div className="text-lg font-medium">지도 로딩 중...</div>
      </div>
    </div>
  ),
});

export default function Home() {
  return <EarthTravel />;
}
