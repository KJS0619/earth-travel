'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getFlagUrl } from './FlagIcon';

// body에 직접 렌더링하기 위한 Portal 컴포넌트
function PrintPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}

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
  // 인쇄 시 print 클래스를 body에 추가
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-stickers');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-stickers');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          /* 기본 페이지 설정 */
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          /* 모든 요소 숨기기 */
          html, body {
            height: auto !important;
            overflow: visible !important;
          }

          body > * {
            display: none !important;
          }

          /* 인쇄 영역만 표시 */
          body > #sticker-print-area {
            display: block !important;
          }

          #sticker-print-area {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            visibility: visible !important;
            background: white !important;
          }

          .print-page {
            width: 190mm;
            height: 277mm;
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding-top: 5mm;
            box-sizing: border-box;
          }

          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .print-row {
            display: flex;
            justify-content: center;
            gap: 4mm;
            margin-bottom: 4mm;
          }

          .sticker-print-item {
            width: 92mm !important;
            height: 85mm !important;
            flex-shrink: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        /* 화면에서는 인쇄 영역 숨기기 */
        #sticker-print-area {
          position: fixed;
          left: -9999px;
          top: 0;
          visibility: hidden;
          pointer-events: none;
        }
      `}</style>

      {/* Modal Backdrop */}
      <div
        className="modal-backdrop fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="modal-container fixed inset-4 md:inset-10 bg-slate-900 rounded-2xl border border-slate-700 z-[10000] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
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

        {/* Preview Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visitedCountries.map((country, index) => (
              <StickerCard key={country.code} country={country} index={index} />
            ))}
          </div>

          {visitedCountries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <span className="text-4xl mb-3">🗺️</span>
              <p className="text-sm">아직 방문한 국가가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 text-center text-xs text-slate-500">
          💡 스티커 용지(A4)에 인쇄 후 오려서 사용하세요. 총 {visitedCountries.length}개 스티커
        </div>
      </div>

      {/* Print Container - 인쇄 전용 (화면에서는 숨김) */}
      {/* body 직접 자식으로 렌더링하기 위해 Portal 사용 */}
      <PrintPortal>
        <div id="sticker-print-area">
          {/* 페이지별로 6개씩 그룹화 (3행 x 2열) */}
          {Array.from({ length: Math.ceil(visitedCountries.length / 6) }).map((_, pageIndex) => {
            const pageCountries = visitedCountries.slice(pageIndex * 6, pageIndex * 6 + 6);
            const rows = Array.from({ length: Math.ceil(pageCountries.length / 2) });

            return (
              <div key={`page-${pageIndex}`} className="print-page">
                {rows.map((_, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="print-row">
                    {pageCountries.slice(rowIndex * 2, rowIndex * 2 + 2).map((country, colIndex) => (
                      <StickerCard
                        key={`print-${country.code}`}
                        country={country}
                        index={pageIndex * 6 + rowIndex * 2 + colIndex}
                        forPrint
                      />
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </PrintPortal>
    </>
  );
}

function StickerCard({ country, index, forPrint = false }: { country: VisitedCountry; index: number; forPrint?: boolean }) {
  const containerStyle: React.CSSProperties = forPrint ? {
    width: '94mm',
    height: '86mm',
    padding: '8px',
    borderRadius: '12px',
    border: '3px dashed #d97706',
    background: 'linear-gradient(135deg, #fffbeb 0%, #fed7aa 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  } : {};

  const baseClass = forPrint
    ? "sticker-print-item"
    : "aspect-square p-4 rounded-2xl border-4 border-dashed border-amber-600/60 bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center text-center relative overflow-hidden";

  return (
    <div className={baseClass} style={containerStyle}>
      {/* Corner decorations */}
      <div style={{ position: 'absolute', top: 8, left: 8, width: 12, height: 12, borderTop: '2px solid #b45309', borderLeft: '2px solid #b45309', borderRadius: '4px 0 0 0' }} />
      <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderTop: '2px solid #b45309', borderRight: '2px solid #b45309', borderRadius: '0 4px 0 0' }} />
      <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12, borderBottom: '2px solid #b45309', borderLeft: '2px solid #b45309', borderRadius: '0 0 0 4px' }} />
      <div style={{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12, borderBottom: '2px solid #b45309', borderRight: '2px solid #b45309', borderRadius: '0 0 4px 0' }} />

      {/* Stamp label */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%) rotate(-3deg)',
        background: '#be123c',
        color: 'white',
        fontSize: '8px',
        fontWeight: 'bold',
        padding: '2px 8px',
        borderRadius: '2px',
        letterSpacing: '0.5px',
      }}>
        {STAMP_LABELS[index % STAMP_LABELS.length]}
      </div>

      {/* Flag */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={getFlagUrl(country.code, forPrint ? 80 : 160)}
          alt={country.code}
          style={{
            width: forPrint ? 60 : 72,
            height: forPrint ? 40 : 48,
            borderRadius: 4,
            border: '2px solid rgba(180, 83, 9, 0.4)',
            objectFit: 'cover',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          }}
          onError={(e) => { e.currentTarget.outerHTML = `<span style="font-size:${forPrint ? 48 : 56}px">${country.flag}</span>`; }}
        />
      </div>

      {/* Country code */}
      <div style={{
        background: '#1e293b',
        color: '#fcd34d',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        padding: '2px 8px',
        borderRadius: '4px',
        marginBottom: '4px',
        border: '1px solid #334155',
      }}>
        [{country.code}]
      </div>

      {/* Country name */}
      <div style={{ fontSize: forPrint ? '14px' : '16px', fontWeight: 'bold', color: '#1e293b' }}>
        {country.ko}
      </div>
      <div style={{ fontSize: '9px', color: '#64748b' }}>
        {country.en}
      </div>

      {/* Year & Note */}
      {(country.year || country.note) && (
        <div style={{
          marginTop: '8px',
          padding: '4px 8px',
          background: 'rgba(251, 191, 36, 0.4)',
          borderRadius: '6px',
          border: '1px solid rgba(251, 191, 36, 0.6)',
          maxWidth: '90%',
        }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#92400e' }}>
            {country.year}{country.year && country.note ? ' • ' : ''}{country.note}
          </div>
        </div>
      )}

      {/* Check mark */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        fontSize: '20px',
        color: 'rgba(180, 83, 9, 0.3)',
        fontWeight: 'bold',
        transform: 'rotate(-15deg)',
      }}>
        ✓
      </div>

      {/* Continent */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        fontSize: '8px',
        color: '#64748b',
        background: 'rgba(255,255,255,0.7)',
        padding: '2px 6px',
        borderRadius: '4px',
      }}>
        {country.continent}
      </div>
    </div>
  );
}
