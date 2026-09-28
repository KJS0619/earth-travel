'use client';

import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';

interface VisitedCountry {
  code: string;
  ko: string;
  en: string;
  flag: string;
  continent: string;
  lat: number;
  lng: number;
  year?: string;
  note?: string;
}

interface TravelPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitedCountries: VisitedCountry[];
}

export default function TravelPassportModal({ isOpen, onClose, visitedCountries }: TravelPassportModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [cardRatio, setCardRatio] = useState<'square' | 'story'>('square');

  useEffect(() => {
    // Check if Web Share API is available
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      setCanShare(true);
    }
  }, []);

  if (!isOpen) return null;

  const totalCountries = visitedCountries.length;
  const worldPercent = ((totalCountries / 195) * 100).toFixed(1);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  // Continent stats
  const continentCounts: Record<string, number> = { '아시아': 0, '유럽': 0, '아메리카': 0, '오세아니아': 0, '아프리카': 0 };
  visitedCountries.forEach((c) => {
    if (continentCounts[c.continent] !== undefined) continentCounts[c.continent]++;
  });

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2, // High resolution
        backgroundColor: '#0f172a',
      });

      const link = document.createElement('a');
      link.download = `my-travel-passport-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image download error:', err);
      alert('이미지 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || !canShare) return;
    setIsDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
      });

      // Convert data URL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'my-travel-passport.png', { type: 'image/png' });

      await navigator.share({
        title: '나의 여행 여권',
        text: `🌍 ${totalCountries}개국 탐험 완료! 전 세계 ${worldPercent}% 정복`,
        files: [file],
      });
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-4 md:inset-10 bg-slate-900 rounded-2xl border border-slate-700 z-[10000] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛂</span>
            <div>
              <h2 className="text-lg font-bold text-white">나의 여행 여권 카드</h2>
              <p className="text-xs text-slate-400">SNS 공유용 인증 카드 생성</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Ratio Toggle */}
            <div className="flex bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setCardRatio('square')}
                className={`px-2 py-1 text-xs rounded-md transition ${cardRatio === 'square' ? 'bg-amber-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                1:1
              </button>
              <button
                onClick={() => setCardRatio('story')}
                className={`px-2 py-1 text-xs rounded-md transition ${cardRatio === 'story' ? 'bg-amber-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                4:5
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Card Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex items-center justify-center">
          {/* Passport Card */}
          <div
            ref={cardRef}
            className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-4 border-amber-600/60 shadow-2xl overflow-hidden ${
              cardRatio === 'square' ? 'w-[400px] aspect-square' : 'w-[360px] aspect-[4/5]'
            }`}
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-4 py-3 text-center">
              <div className="text-[10px] tracking-[0.3em] text-amber-950 font-semibold">WORLD TRAVEL</div>
              <div className="text-xl font-black text-slate-900 tracking-wide">PASSPORT</div>
            </div>

            {/* Main Content */}
            <div className="p-5 space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/80 rounded-xl p-3 text-center border border-slate-700">
                  <div className="text-3xl font-black text-amber-400">{totalCountries}</div>
                  <div className="text-[10px] text-slate-400 font-medium">방문 국가</div>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-3 text-center border border-slate-700">
                  <div className="text-3xl font-black text-cyan-400">{worldPercent}%</div>
                  <div className="text-[10px] text-slate-400 font-medium">세계 정복률</div>
                </div>
              </div>

              {/* Continent Stats */}
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
                <div className="text-[9px] text-slate-500 font-semibold mb-2 tracking-wider">CONTINENT BREAKDOWN</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(continentCounts).map(([continent, count]) => (
                    count > 0 && (
                      <span key={continent} className="px-2 py-0.5 rounded-full bg-slate-700/80 text-[10px] text-slate-300 border border-slate-600">
                        {continent} <span className="text-amber-400 font-bold">{count}</span>
                      </span>
                    )
                  ))}
                </div>
              </div>

              {/* Visited Countries Flags */}
              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/40">
                <div className="text-[9px] text-slate-500 font-semibold mb-2 tracking-wider">VISITED COUNTRIES</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {visitedCountries.slice(0, cardRatio === 'square' ? 18 : 24).map((country) => (
                    <div
                      key={country.code}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/60 rounded border border-slate-600/50"
                    >
                      <span className="text-sm">{country.flag}</span>
                      <span className="text-[9px] text-slate-300 font-medium">{country.ko}</span>
                    </div>
                  ))}
                  {visitedCountries.length > (cardRatio === 'square' ? 18 : 24) && (
                    <span className="px-2 py-0.5 bg-amber-600/30 rounded text-[9px] text-amber-300 font-bold border border-amber-500/40">
                      +{visitedCountries.length - (cardRatio === 'square' ? 18 : 24)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-4 py-2.5 border-t border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[8px] text-slate-500 tracking-wider">EXPLORER RECORD</div>
                  <div className="text-[10px] text-slate-300 font-mono">{today}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">🌏</span>
                  <div className="text-right">
                    <div className="text-[8px] text-slate-500">EARTH TRAVEL</div>
                    <div className="text-[10px] text-amber-400 font-bold">CERTIFIED</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-center gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading || visitedCountries.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? '⏳ 생성 중...' : '📥 이미지 다운로드 (PNG)'}
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              disabled={isDownloading || visitedCountries.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📲 공유하기
            </button>
          )}
        </div>

        {visitedCountries.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
            <div className="text-center text-slate-400">
              <span className="text-4xl mb-3 block">🗺️</span>
              <p className="text-sm">방문한 국가가 없습니다.</p>
              <p className="text-xs mt-1">먼저 가본 나라를 추가해주세요.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
