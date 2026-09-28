'use client';

import React, { useRef } from 'react';

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

interface TravelStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitedCountries: VisitedCountry[];
}

const STAMP_LABELS = [
  'PASSPORT VERIFIED',
  'TRAVEL LOG',
  'VISITED',
  'STAMP APPROVED',
  'JOURNEY MADE',
  'ADVENTURE',
];

export default function TravelStickerModal({ isOpen, onClose, visitedCountries }: TravelStickerModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] print:hidden"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-4 md:inset-10 bg-slate-900 rounded-2xl border border-slate-700 z-[10000] flex flex-col overflow-hidden print:fixed print:inset-0 print:bg-white print:border-none print:rounded-none print:z-auto">
        {/* Header - Hidden on print */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎫</span>
            <div>
              <h2 className="text-lg font-bold text-white">여행 스티커 출력</h2>
              <p className="text-xs text-slate-400">다이어리/캐리어 부착용 감성 스티커</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold rounded-xl hover:brightness-110 transition text-sm"
            >
              🖨️ 인쇄하기
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sticker Grid - This is what gets printed */}
        <div
          ref={printRef}
          id="sticker-print-area"
          className="flex-1 overflow-y-auto p-6 bg-slate-950 print:bg-white print:p-0 print:overflow-visible"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-[12mm] print:p-[10mm]">
            {visitedCountries.map((country, index) => (
              <div
                key={country.code}
                className="sticker-item aspect-square p-4 rounded-2xl border-4 border-dashed border-amber-600/60 bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center text-center relative overflow-hidden print:break-inside-avoid print:w-[85mm] print:h-[85mm] print:rounded-xl"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 2px 10px rgba(255,255,255,0.3)',
                }}
              >
                {/* Vintage texture overlay */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiPjwvcmVjdD4KPC9zdmc+')]" />

                {/* Corner decorations */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-700/40 rounded-tl" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-700/40 rounded-tr" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-amber-700/40 rounded-bl" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-amber-700/40 rounded-br" />

                {/* Top stamp label */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-700/90 text-white text-[8px] font-bold tracking-wider rounded-sm rotate-[-3deg] shadow-sm print:text-[7px]">
                  {STAMP_LABELS[index % STAMP_LABELS.length]}
                </div>

                {/* Flag emoji */}
                <div className="text-5xl md:text-6xl mb-2 drop-shadow-md print:text-5xl">
                  {country.flag}
                </div>

                {/* Country code badge */}
                <div className="px-2 py-0.5 bg-slate-800 text-amber-300 text-xs font-mono font-bold rounded mb-1 border border-slate-700 print:text-[10px]">
                  [{country.code}]
                </div>

                {/* Country name */}
                <div className="text-base md:text-lg font-bold text-slate-800 leading-tight print:text-sm">
                  {country.ko}
                </div>
                <div className="text-[10px] text-slate-500 font-medium print:text-[8px]">
                  {country.en}
                </div>

                {/* Year and note */}
                {(country.year || country.note) && (
                  <div className="mt-2 px-2 py-1 bg-amber-200/60 rounded-lg border border-amber-400/40 max-w-full">
                    <div className="text-xs font-semibold text-amber-800 truncate print:text-[9px]">
                      {country.year && <span>{country.year}</span>}
                      {country.year && country.note && <span> • </span>}
                      {country.note && <span className="font-normal">{country.note}</span>}
                    </div>
                  </div>
                )}

                {/* Bottom stamp decoration */}
                <div className="absolute bottom-3 right-3 text-amber-700/30 text-2xl font-serif font-bold rotate-[-15deg] print:text-xl">
                  ✓
                </div>

                {/* Continent badge */}
                <div className="absolute bottom-3 left-3 text-[8px] text-slate-500 font-medium bg-white/60 px-1.5 py-0.5 rounded print:text-[7px]">
                  {country.continent}
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {visitedCountries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 print:hidden">
              <span className="text-4xl mb-3">🗺️</span>
              <p className="text-sm">아직 방문한 국가가 없습니다.</p>
              <p className="text-xs text-slate-600">국가를 추가하면 스티커가 생성됩니다.</p>
            </div>
          )}
        </div>

        {/* Footer info - Hidden on print */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 text-center text-xs text-slate-500 print:hidden">
          💡 Tip: 스티커 용지(A4)에 인쇄 후 오려서 사용하세요. 총 {visitedCountries.length}개 스티커
        </div>
      </div>

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything except print area */
          body * {
            visibility: hidden;
          }

          #sticker-print-area,
          #sticker-print-area * {
            visibility: visible;
          }

          #sticker-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }

          .sticker-item {
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </>
  );
}
