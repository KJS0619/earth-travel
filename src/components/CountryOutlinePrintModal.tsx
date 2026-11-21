'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type Position = [number, number];
type GeoGeometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'MultiPoint'; coordinates: Position[] }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };
type CountryShape = { code: string; code3: string; ko: string; ja: string; en: string; center: Position; geometry: GeoGeometry };
type AdminShape = { code: string; code3: string; name: string; ko: string; ja: string; geometry: GeoGeometry };
type City = { code: string; name: string; ko: string; ja: string; population: number; capital: boolean; geometry: GeoGeometry };
type MapData = { countries: CountryShape[]; admin1: AdminShape[]; cities: City[] };
type CountryOption = { code: string; ko: string; flag: string; continent: string };
type Language = 'ko' | 'ja' | 'en';
type Layout = 'country' | 'world';

const GRID_UNIT = { width: 1000, height: 707 };
const PRINT_OVERLAP = { x: 28, y: 20 };

function visitPositions(geometry: GeoGeometry, visit: (position: Position) => void) {
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      visit(value as Position);
      return;
    }
    value.forEach(walk);
  };
  walk(geometry.coordinates);
}

function geometryPath(geometry: GeoGeometry, project: (point: Position) => [number, number]) {
  const subpaths: string[] = [];
  const addRing = (positions: Position[]) => {
    if (positions.length < 2) return;
    subpaths.push(positions.map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ') + ' Z');
  };
  if (geometry.type === 'Polygon') geometry.coordinates.forEach(addRing);
  if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
  return subpaths.join(' ');
}

function wrapLongitude(longitude: number, center: number) {
  let value = longitude;
  while (value - center > 180) value -= 360;
  while (value - center < -180) value += 360;
  return value;
}

function localizedName(value: { ko?: string; ja?: string; en?: string; name?: string }, language: Language) {
  if (language === 'ko') return value.ko || value.name || value.en || '';
  if (language === 'ja') return value.ja || value.name || value.en || '';
  return value.en || value.name || '';
}

export default function CountryOutlinePrintModal({ open, onClose, countryOptions }: {
  open: boolean;
  onClose: () => void;
  countryOptions: CountryOption[];
}) {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState('KR');
  const [selectedWorldCodes, setSelectedWorldCodes] = useState<string[]>(['KR', 'JP']);
  const [layout, setLayout] = useState<Layout>('country');
  const [scale, setScale] = useState<100 | 200 | 300>(100);
  const [language, setLanguage] = useState<Language>('ko');
  const [showAdmin, setShowAdmin] = useState(true);
  const [showCities, setShowCities] = useState(true);

  useEffect(() => {
    if (!open || data || loading) return;
    setLoading(true);
    fetch('/print-map-data.json')
      .then((response) => {
        if (!response.ok) throw new Error('지도 자료를 불러오지 못했습니다.');
        return response.json() as Promise<MapData>;
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, data, loading]);

  const selectedCountry = countryOptions.find((country) => country.code === selectedCode) ?? countryOptions[0];
  const selectedWorldCountries = countryOptions.filter((country) => selectedWorldCodes.includes(country.code));
  const selectedShapes = useMemo(() => data?.countries.filter((shape) => shape.code === selectedCode) ?? [], [data, selectedCode]);
  const referenceShape = selectedShapes[0];
  const worldCountryShapes = useMemo(() => (data?.countries ?? []).filter((shape) => selectedWorldCodes.includes(shape.code)), [data, selectedWorldCodes]);
  const centerLongitude = layout === 'world' ? 0 : referenceShape?.center[0] ?? 0;
  const centerLatitude = layout === 'world' ? 15 : referenceShape?.center[1] ?? 0;
  const xCorrection = layout === 'world' ? 1 : Math.max(0.18, Math.cos(centerLatitude * Math.PI / 180));

  const activeShapes = useMemo(() => {
    if (!data) return [];
    if (layout === 'world') return data.countries.filter((country) => country.code !== 'AQ');
    return selectedShapes;
  }, [data, layout, selectedShapes]);

  const adminShapes = useMemo(() => {
    if (!data || layout !== 'country' || !referenceShape) return [];
    if (!showAdmin) return [];
    return data.admin1.filter((shape) => shape.code === selectedCode || shape.code3 === referenceShape.code3);
  }, [data, layout, referenceShape, selectedCode, showAdmin]);

  const cities = useMemo(() => {
    if (!data || !showCities || layout !== 'country') return [];
    return data.cities
      .filter((city) => city.code === selectedCode)
      .sort((a, b) => Number(b.capital) - Number(a.capital) || b.population - a.population)
      .slice(0, 22);
  }, [data, layout, selectedCode, showCities]);

  const columns = scale / 100;
  const rows = scale / 100;
  const atlasStepX = GRID_UNIT.width - PRINT_OVERLAP.x;
  const atlasStepY = GRID_UNIT.height - PRINT_OVERLAP.y;
  const atlasWidth = GRID_UNIT.width + atlasStepX * (columns - 1);
  const atlasHeight = GRID_UNIT.height + atlasStepY * (rows - 1);
  const pageViews = useMemo(() => Array.from({ length: columns * rows }, (_, index) => ({
    column: index % columns,
    row: Math.floor(index / columns),
  })), [columns, rows]);

  const { project, paths } = useMemo(() => {
    const points: Position[] = [];
    activeShapes.forEach((shape) => visitPositions(shape.geometry, (point) => points.push(point)));
    adminShapes.forEach((shape) => visitPositions(shape.geometry, (point) => points.push(point)));
    cities.forEach((city) => visitPositions(city.geometry, (point) => points.push(point)));
    if (points.length === 0) {
      return { project: (_point: Position): [number, number] => [atlasWidth / 2, atlasHeight / 2], paths: [] as { key: string; d: string; selected: boolean; admin: boolean }[] };
    }

    const projectGeo = (point: Position): [number, number] => [
      wrapLongitude(point[0], centerLongitude) * xCorrection,
      -point[1],
    ];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const point of points) {
      const [x, y] = projectGeo(point);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const geoWidth = Math.max(maxX - minX, 0.0001);
    const geoHeight = Math.max(maxY - minY, 0.0001);
    const margin = layout === 'world' ? 48 : 105;
    const fit = Math.min((atlasWidth - margin * 2) / geoWidth, (atlasHeight - margin * 2) / geoHeight);
    const drawnWidth = geoWidth * fit;
    const drawnHeight = geoHeight * fit;
    const left = (atlasWidth - drawnWidth) / 2;
    const top = (atlasHeight - drawnHeight) / 2;
    const project = (point: Position): [number, number] => {
      const [x, y] = projectGeo(point);
      return [left + (x - minX) * fit, top + (y - minY) * fit];
    };
    const paths = [
      ...activeShapes.map((shape, index) => ({ key: `country-${shape.code}-${index}`, d: geometryPath(shape.geometry, project), selected: layout === 'world' ? selectedWorldCodes.includes(shape.code) : shape.code === selectedCode, admin: false })),
      ...adminShapes.map((shape, index) => ({ key: `admin-${shape.code3}-${shape.name}-${index}`, d: geometryPath(shape.geometry, project), selected: false, admin: true })),
    ].filter((shape) => shape.d.length > 0);
    return { project, paths };
  }, [activeShapes, adminShapes, cities, selectedCode, selectedWorldCodes, centerLongitude, xCorrection, layout, atlasWidth, atlasHeight]);

  const printPages = () => {
    document.body.classList.add('country-outline-printing');
    window.setTimeout(() => window.print(), 120);
  };

  useEffect(() => {
    const afterPrint = () => document.body.classList.remove('country-outline-printing');
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  if (!open || typeof document === 'undefined') return null;

  const renderMap = (viewBox: string) => (
    <svg className="country-outline-map" viewBox={viewBox} role="img" aria-label={layout === 'world' ? 'World map with selected countries highlighted' : `${localizedName(referenceShape ?? {}, language)} map`} preserveAspectRatio="xMidYMid meet">
      <rect x={viewBox.split(' ')[0]} y={viewBox.split(' ')[1]} width={GRID_UNIT.width} height={GRID_UNIT.height} fill="white" />
      {paths.map((shape) => <path key={shape.key} d={shape.d} fill={shape.selected ? '#eef5fb' : 'none'} fillRule="evenodd" stroke={shape.admin ? '#94a3b8' : shape.selected ? '#142a3c' : '#657789'} strokeWidth={shape.admin ? 1.15 : shape.selected ? 2.4 : 1.7} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
      {layout === 'world' && worldCountryShapes.map((shape, index) => {
        const point = project(shape.center);
        const textAnchor = index % 2 === 0 ? 'start' : 'end';
        const xOffset = index % 2 === 0 ? 12 : -12;
        return <g key={`world-label-${shape.code}-${index}`}><circle cx={point[0]} cy={point[1]} r="8" fill="#0e7490" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke"/><text x={point[0] + xOffset} y={point[1] - 10} textAnchor={textAnchor} fontSize="18" fontWeight="700" fill="#0f2638" stroke="white" strokeWidth="5" paintOrder="stroke">{localizedName(shape, language)}</text></g>;
      })}
      {cities.map((city) => {
        const point = visitCityPoint(city);
        if (!point) return null;
        return <g key={`city-${city.name}`}><circle cx={point[0]} cy={point[1]} r={city.capital ? 5.5 : 3.5} fill={city.capital ? '#be123c' : '#0e7490'} stroke="white" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/><text x={point[0] + 8} y={point[1] - 6} fontSize={city.capital ? 16 : 13} fontWeight={city.capital ? 700 : 500} fill="#152536" stroke="white" strokeWidth="4" paintOrder="stroke">{localizedName(city, language)}</text></g>;
      })}
      <text x={GRID_UNIT.width / 2 + Number(viewBox.split(' ')[0])} y={GRID_UNIT.height - 18 + Number(viewBox.split(' ')[1])} textAnchor="middle" fontSize="12" fill="#667085">{language === 'ko' ? '경계·도시 자료: Natural Earth' : language === 'ja' ? '境界・都市データ: Natural Earth' : 'Boundary and city data: Natural Earth'}</text>
    </svg>
  );

  function visitCityPoint(city: City): [number, number] | null {
    if (city.geometry.type !== 'Point') return null;
    return project(city.geometry.coordinates);
  }

  return <>
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl" aria-label="백지도 인쇄 설정">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-4 sm:p-5">
          <div><h2 className="text-lg font-bold sm:text-xl">백지도 인쇄</h2><p className="mt-1 text-xs text-slate-400 sm:text-sm">국가 경계와 주요 행정도시를 벡터 지도로 출력합니다.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-800" aria-label="닫기">✕</button>
        </header>
        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-300">지도 형태<select value={layout} onChange={(event) => setLayout(event.target.value as Layout)} className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"><option value="country">선택 국가 백지도</option><option value="world">세계 국가 위치도</option></select></label>
          {layout === 'country' ? <label className="text-xs font-semibold text-slate-300">국가 선택<select value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white">{countryOptions.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.ko}</option>)}</select></label> : <fieldset className="sm:col-span-2 lg:col-span-4"><legend className="text-xs font-semibold text-slate-300">강조할 나라 여러 개 선택 · {selectedWorldCodes.length}개 선택</legend><div className="mt-1.5 grid max-h-36 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-2 sm:grid-cols-3 lg:grid-cols-5">{countryOptions.map((country) => <label key={country.code} className="flex min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-xs text-slate-200 hover:bg-slate-800"><input type="checkbox" checked={selectedWorldCodes.includes(country.code)} onChange={(event) => setSelectedWorldCodes((current) => event.target.checked ? [...current, country.code] : current.filter((code) => code !== country.code))} className="h-3.5 w-3.5 shrink-0 accent-cyan-500"/><span className="truncate" title={country.ko}>{country.flag} {country.ko}</span></label>)}</div><div className="mt-1 flex justify-end gap-2"><button type="button" onClick={() => setSelectedWorldCodes([])} className="rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800">전체 해제</button><button type="button" onClick={() => setSelectedWorldCodes(countryOptions.map((country) => country.code))} className="rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800">모두 선택</button></div></fieldset>}
          <label className="text-xs font-semibold text-slate-300">지도 표기<select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"><option value="ko">한국어</option><option value="ja">日本語</option><option value="en">English</option></select></label>
          <label className="text-xs font-semibold text-slate-300">인쇄 확대<select value={scale} onChange={(event) => setScale(Number(event.target.value) as 100 | 200 | 300)} className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"><option value={100}>100% · 1장</option><option value={200}>200% · 4장</option><option value={300}>300% · 9장</option></select></label>
          <label className={`flex items-center gap-2 text-sm text-slate-300 ${layout === 'world' ? 'opacity-50' : ''}`}><input type="checkbox" checked={showAdmin} disabled={layout === 'world'} onChange={(event) => setShowAdmin(event.target.checked)} className="h-4 w-4 accent-cyan-500"/>도·주 경계선</label>
          <label className={`flex items-center gap-2 text-sm text-slate-300 ${layout === 'world' ? 'opacity-50' : ''}`}><input type="checkbox" checked={showCities} disabled={layout === 'world'} onChange={(event) => setShowCities(event.target.checked)} className="h-4 w-4 accent-cyan-500"/>주요 행정도시</label>
        </div>
        <div className="mx-4 mb-3 flex-1 overflow-auto rounded-xl border border-slate-800 bg-white p-2 sm:mx-5 sm:mb-4">
          {loading && <div className="flex min-h-56 items-center justify-center text-sm text-slate-600">세계 지도 경계 자료를 불러오는 중…</div>}
          {!loading && !data && <div className="flex min-h-56 items-center justify-center text-sm text-rose-700">지도 자료를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</div>}
          {!loading && data && renderMap(`0 0 ${GRID_UNIT.width} ${GRID_UNIT.height}`)}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 p-4 sm:p-5">
          <p className="text-xs leading-5 text-slate-400">{layout === 'world' ? `${selectedWorldCountries.length}개 나라를 동시에 강조합니다.` : `${selectedCountry?.ko ?? ''} 백지도 · A4 가로 · ${columns}×${rows} ${columns * rows}장${scale > 100 ? ' · 이어 붙이기 쉽게 가장자리 중첩' : ''}`}</p>
          <button type="button" disabled={!data || loading} onClick={printPages} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">인쇄 / PDF 저장</button>
        </footer>
      </section>
    </div>
    {createPortal(
      <div className="country-outline-print-root">
        {pageViews.map((page, index) => {
          const x = page.column * atlasStepX;
          const y = page.row * atlasStepY;
          const viewBox = `${x} ${y} ${GRID_UNIT.width} ${GRID_UNIT.height}`;
          return <section className="country-outline-print-page" key={`print-${page.row}-${page.column}`}>
            <header className="country-outline-print-header"><strong>{layout === 'world' ? `${selectedWorldCountries.length}${language === 'ko' ? '개국 강조 · 세계 국가 위치도' : language === 'ja' ? 'か国を強調 · 世界の国位置図' : ' countries highlighted · World map'}` : `${selectedCountry?.flag} ${localizedName(referenceShape ?? {}, language)}${language === 'ko' ? ' · 백지도' : language === 'ja' ? ' · 白地図' : ' · Outline map'}`}</strong><span>{index + 1} / {pageViews.length}</span></header>
            {renderMap(viewBox)}
          </section>;
        })}
      </div>,
      document.body,
    )}
  </>;
}
