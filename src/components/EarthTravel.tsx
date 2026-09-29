'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import TravelStickerModal from './TravelStickerModal';
import TravelPassportModal from './TravelPassportModal';
import FlagIcon from './FlagIcon';

// Supabase initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Types
interface CountryInfo {
  code: string;
  ko: string;
  en: string;
  flag: string;
}

interface VisitedCountry extends CountryInfo {
  continent: string;
  lat: number;
  lng: number;
  year?: string;
  note?: string;
}

interface Waypoint {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  day: string;
}

interface CruisePreset {
  id: string;
  region: string;
  name: string;
  subtitle: string;
  badge: string;
  recommendedMode: string;
  curvature: number;
  waypoints: Waypoint[];
}

// My Trip Types
type TransportMode = 'plane' | 'boat' | 'train' | 'bus' | 'car';

// ========== Web Audio API Sound Engine ==========
class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeOscillators: OscillatorNode[] = [];
  private isMuted: boolean = false;

  init(): boolean {
    if (this.audioCtx) return true;
    try {
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
      this.masterGain.gain.value = 0.3;
      return true;
    } catch {
      return false;
    }
  }

  resume(): void {
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.3;
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  stopAll(): void {
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.activeOscillators = [];
    this.activeNodes = [];
  }

  // 비행기: 로우패스 필터를 거친 바람/순항음
  playPlane(): () => void {
    if (!this.audioCtx || !this.masterGain) return () => {};

    const ctx = this.audioCtx;
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;
    lowpass.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    whiteNoise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);
    whiteNoise.start();

    this.activeNodes.push(whiteNoise, lowpass, gain);

    return () => {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      setTimeout(() => {
        try { whiteNoise.stop(); } catch {}
      }, 500);
    };
  }

  // 기차: 철로 리듬 펄스가 있는 레일 마찰음
  playTrain(): () => void {
    if (!this.audioCtx || !this.masterGain) return () => {};

    const ctx = this.audioCtx;
    let running = true;

    const playRhythm = () => {
      if (!running) return;

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 80 + Math.random() * 20;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200;
      filter.Q.value = 2;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);

      this.activeOscillators.push(osc);

      setTimeout(() => {
        if (running) playRhythm();
      }, 280 + Math.random() * 40);
    };

    playRhythm();

    return () => {
      running = false;
    };
  }

  // 배: 바다 물결 앰비언스 + 묵직한 뱃고동
  playBoat(playHorn: boolean = false): () => void {
    if (!this.audioCtx || !this.masterGain) return () => {};

    const ctx = this.audioCtx;

    // 물결 앰비언스 (필터된 노이즈)
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const waveNoise = ctx.createBufferSource();
    waveNoise.buffer = noiseBuffer;
    waveNoise.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 300;
    bandpass.Q.value = 0.5;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.08;

    // LFO로 물결 느낌
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);
    lfo.start();

    waveNoise.connect(bandpass);
    bandpass.connect(waveGain);
    waveGain.connect(this.masterGain);
    waveNoise.start();

    this.activeNodes.push(waveNoise, bandpass, waveGain, lfo, lfoGain);

    // 뱃고동 (출발 시)
    if (playHorn) {
      setTimeout(() => {
        const horn = ctx.createOscillator();
        horn.type = 'sawtooth';
        horn.frequency.value = 110;

        const hornGain = ctx.createGain();
        hornGain.gain.value = 0;
        hornGain.gain.setValueAtTime(0, ctx.currentTime);
        hornGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);
        hornGain.gain.setValueAtTime(0.15, ctx.currentTime + 1.5);
        hornGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

        const hornFilter = ctx.createBiquadFilter();
        hornFilter.type = 'lowpass';
        hornFilter.frequency.value = 200;

        horn.connect(hornFilter);
        hornFilter.connect(hornGain);
        hornGain.connect(this.masterGain!);
        horn.start();
        horn.stop(ctx.currentTime + 3);

        this.activeOscillators.push(horn);
      }, 100);
    }

    return () => {
      waveGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      setTimeout(() => {
        try {
          waveNoise.stop();
          lfo.stop();
        } catch {}
      }, 500);
    };
  }

  // 자동차/버스: 엔진음
  playCar(): () => void {
    if (!this.audioCtx || !this.masterGain) return () => {};

    const ctx = this.audioCtx;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 65;

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 130;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.value = 0.06;

    // 약간의 떨림 효과 (LFO)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 8;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    lfo.start();

    this.activeOscillators.push(osc1, osc2, lfo);
    this.activeNodes.push(filter, gain, lfoGain);

    return () => {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          lfo.stop();
        } catch {}
      }, 300);
    };
  }

  // 도착 차임벨: 맑은 2음 벨소리
  playArrivalChime(): void {
    if (!this.audioCtx || !this.masterGain || this.isMuted) return;

    const ctx = this.audioCtx;
    const notes = [523.25, 659.25]; // C5, E5

    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        osc.stop(ctx.currentTime + 1);
      }, i * 200);
    });
  }

  // 교통수단별 사운드 재생
  playTransportSound(mode: TransportMode, isStart: boolean = false): () => void {
    switch (mode) {
      case 'plane':
        return this.playPlane();
      case 'train':
        return this.playTrain();
      case 'boat':
        return this.playBoat(isStart);
      case 'car':
      case 'bus':
        return this.playCar();
      default:
        return () => {};
    }
  }

  cleanup(): void {
    this.stopAll();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.masterGain = null;
  }
}

// 싱글톤 인스턴스
const soundEngine = new SoundEngine();
// ================================================

interface MyTripWaypoint {
  id: string;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  order: number;
  transportToNext?: TransportMode;
}

// My Trip Distance & Time Helpers
const calculateHaversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const TRANSPORT_SPEEDS: Record<TransportMode, number> = {
  plane: 800,   // km/h
  train: 200,   // km/h
  car: 80,      // km/h
  bus: 80,      // km/h
  boat: 35,     // km/h (크루즈)
};

const calculateTravelTime = (distanceKm: number, mode: TransportMode): number => {
  const speed = TRANSPORT_SPEEDS[mode];
  let hours = distanceKm / speed;
  // 비행기는 이착륙 버퍼 1시간 추가
  if (mode === 'plane') hours += 1;
  return hours;
};

const formatTravelTime = (hours: number): string => {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `약 ${mins}분`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `약 ${h}시간`;
  return `약 ${h}시간 ${m}분`;
};

interface MyTripLegInfo {
  distanceKm: number;
  travelTimeHours: number;
  formattedDistance: string;
  formattedTime: string;
}

// Saved Trip Type (Supabase)
interface SavedTrip {
  id: string;
  device_id: string;
  title: string;
  waypoints: MyTripWaypoint[];
  total_distance_km: number;
  total_time_hours: number;
  created_at: string;
}

// Preset Trip Types
type PresetContinent = '아시아' | '유럽' | '아프리카' | '미주' | '도시코스';

interface PresetWaypoint {
  countryCode: string;
  transportToNext?: TransportMode;
  // 도시/랜드마크 코스용 추가 필드
  cityName?: string;
  lat?: number;
  lng?: number;
}

interface TripPreset {
  id: string;
  continent: PresetContinent;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  waypoints: PresetWaypoint[];
}

// Nominatim Search Types
interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name: string;
  address?: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
  type: string;
  class: string;
}

// Preset Trip Data
const TRIP_PRESETS: TripPreset[] = [
  // 아시아
  {
    id: 'asia-1',
    continent: '아시아',
    title: '동남아 3국 힐링',
    description: '한국 → 베트남 → 태국 → 싱가포르 → 한국',
    badge: '초보자 추천',
    badgeColor: 'emerald',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'VN', transportToNext: 'plane' },
      { countryCode: 'TH', transportToNext: 'plane' },
      { countryCode: 'SG', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  {
    id: 'asia-2',
    continent: '아시아',
    title: '일본 골든루트',
    description: '한국 → 오사카 → 교토 → 도쿄 → 한국 (기차 일주)',
    badge: '기차 낭만',
    badgeColor: 'violet',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'JP', cityName: '오사카', lat: 34.6937, lng: 135.5023, transportToNext: 'train' },
      { countryCode: 'JP', cityName: '교토', lat: 35.0116, lng: 135.7681, transportToNext: 'train' },
      { countryCode: 'JP', cityName: '도쿄', lat: 35.6762, lng: 139.6503, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'asia-3',
    continent: '아시아',
    title: '중앙아시아 실크로드',
    description: '한국 → 중국 → 카자흐스탄 → 우즈베키스탄 → 한국',
    badge: '역사 탐방',
    badgeColor: 'amber',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'CN', transportToNext: 'plane' },
      { countryCode: 'KZ', transportToNext: 'plane' },
      { countryCode: 'UZ', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  // 유럽
  {
    id: 'europe-1',
    continent: '유럽',
    title: '서유럽 핵심 기차 일주',
    description: '한국 → 영국 → 프랑스 → 스위스 → 이탈리아 → 한국',
    badge: '기차 낭만',
    badgeColor: 'violet',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'GB', transportToNext: 'train' },
      { countryCode: 'FR', transportToNext: 'train' },
      { countryCode: 'CH', transportToNext: 'train' },
      { countryCode: 'IT', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  {
    id: 'europe-2',
    continent: '유럽',
    title: '북유럽 오로라 투어',
    description: '한국 → 핀란드 → 노르웨이 → 아이슬란드 → 한국',
    badge: '자연 경관',
    badgeColor: 'cyan',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'FI', transportToNext: 'plane' },
      { countryCode: 'NO', transportToNext: 'plane' },
      { countryCode: 'IS', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  {
    id: 'europe-3',
    continent: '유럽',
    title: '동유럽 문화 여행',
    description: '한국 → 체코 → 오스트리아 → 헝가리 → 폴란드 → 한국',
    badge: '가성비 좋음',
    badgeColor: 'rose',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'CZ', transportToNext: 'train' },
      { countryCode: 'AT', transportToNext: 'train' },
      { countryCode: 'HU', transportToNext: 'train' },
      { countryCode: 'PL', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  // 아프리카
  {
    id: 'africa-1',
    continent: '아프리카',
    title: '북아프리카 & 사하라',
    description: '한국 → 이집트 → 모로코 → 한국',
    badge: '이국적 풍경',
    badgeColor: 'orange',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'EG', transportToNext: 'plane' },
      { countryCode: 'MA', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  {
    id: 'africa-2',
    continent: '아프리카',
    title: '동아프리카 사파리',
    description: '한국 → 케냐 → 탄자니아 → 남아공 → 한국',
    badge: '야생 탐험',
    badgeColor: 'lime',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'KE', transportToNext: 'plane' },
      { countryCode: 'TZ', transportToNext: 'plane' },
      { countryCode: 'ZA', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  // 미주
  {
    id: 'america-1',
    continent: '미주',
    title: '미국 횡단 & 로드트립',
    description: '한국 → 뉴욕 → 라스베이거스 → LA → 하와이 → 한국',
    badge: '버킷리스트',
    badgeColor: 'blue',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'US', cityName: '뉴욕', lat: 40.7128, lng: -74.0060, transportToNext: 'car' },
      { countryCode: 'US', cityName: '라스베이거스', lat: 36.1699, lng: -115.1398, transportToNext: 'car' },
      { countryCode: 'US', cityName: 'LA', lat: 34.0522, lng: -118.2437, transportToNext: 'plane' },
      { countryCode: 'US', cityName: '하와이', lat: 21.3069, lng: -157.8583, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'america-2',
    continent: '미주',
    title: '중남미 마야 문명',
    description: '한국 → 멕시코 → 과테말라 → 페루 → 한국',
    badge: '고대 유적',
    badgeColor: 'amber',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'MX', transportToNext: 'plane' },
      { countryCode: 'GT', transportToNext: 'plane' },
      { countryCode: 'PE', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  {
    id: 'america-3',
    continent: '미주',
    title: '캐나다 대자연',
    description: '한국 → 밴쿠버 → 캘거리 → 토론토 → 한국',
    badge: '자연 경관',
    badgeColor: 'cyan',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'CA', cityName: '밴쿠버', lat: 49.2827, lng: -123.1207, transportToNext: 'car' },
      { countryCode: 'CA', cityName: '캘거리', lat: 51.0447, lng: -114.0719, transportToNext: 'plane' },
      { countryCode: 'CA', cityName: '토론토', lat: 43.6532, lng: -79.3832, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'america-4',
    continent: '미주',
    title: '남미 삼국지',
    description: '한국 → 브라질 → 아르헨티나 → 칠레 → 한국',
    badge: '대륙 종단',
    badgeColor: 'fuchsia',
    waypoints: [
      { countryCode: 'KR', transportToNext: 'plane' },
      { countryCode: 'BR', transportToNext: 'plane' },
      { countryCode: 'AR', transportToNext: 'plane' },
      { countryCode: 'CL', transportToNext: 'plane' },
      { countryCode: 'KR' },
    ],
  },
  // 도시 코스
  {
    id: 'city-japan-1',
    continent: '도시코스',
    title: '🇯🇵 일본 골든루트 신칸센',
    description: '서울 ✈️ 도쿄 🚆 교토 🚆 오사카 ✈️ 서울',
    badge: '신칸센 여행',
    badgeColor: 'rose',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'JP', cityName: '도쿄', lat: 35.6762, lng: 139.6503, transportToNext: 'train' },
      { countryCode: 'JP', cityName: '교토', lat: 35.0116, lng: 135.7681, transportToNext: 'train' },
      { countryCode: 'JP', cityName: '오사카', lat: 34.6937, lng: 135.5023, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'city-italy-1',
    continent: '도시코스',
    title: '🇮🇹 이탈리아 3대 예술 도시',
    description: '서울 ✈️ 로마 🚆 피렌체 🚆 베네치아 ✈️ 서울',
    badge: '예술 여행',
    badgeColor: 'amber',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'IT', cityName: '로마', lat: 41.9028, lng: 12.4964, transportToNext: 'train' },
      { countryCode: 'IT', cityName: '피렌체', lat: 43.7696, lng: 11.2558, transportToNext: 'train' },
      { countryCode: 'IT', cityName: '베네치아', lat: 45.4408, lng: 12.3155, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'city-usa-west-1',
    continent: '도시코스',
    title: '🇺🇸 미국 서부 로드트립',
    description: '서울 ✈️ 샌프란시스코 🚗 LA 🚗 라스베이거스 ✈️ 서울',
    badge: '로드트립',
    badgeColor: 'blue',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'US', cityName: '샌프란시스코', lat: 37.7749, lng: -122.4194, transportToNext: 'car' },
      { countryCode: 'US', cityName: 'LA', lat: 34.0522, lng: -118.2437, transportToNext: 'car' },
      { countryCode: 'US', cityName: '라스베이거스', lat: 36.1699, lng: -115.1398, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'city-spain-1',
    continent: '도시코스',
    title: '🇪🇸 스페인 황금 삼각',
    description: '서울 ✈️ 마드리드 🚆 바르셀로나 🚆 세비야 ✈️ 서울',
    badge: '가우디 투어',
    badgeColor: 'orange',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'ES', cityName: '마드리드', lat: 40.4168, lng: -3.7038, transportToNext: 'train' },
      { countryCode: 'ES', cityName: '바르셀로나', lat: 41.3851, lng: 2.1734, transportToNext: 'train' },
      { countryCode: 'ES', cityName: '세비야', lat: 37.3891, lng: -5.9845, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'city-france-1',
    continent: '도시코스',
    title: '🇫🇷 프랑스 낭만 여행',
    description: '서울 ✈️ 파리 🚆 리옹 🚆 니스 ✈️ 서울',
    badge: 'TGV 여행',
    badgeColor: 'indigo',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'FR', cityName: '파리', lat: 48.8566, lng: 2.3522, transportToNext: 'train' },
      { countryCode: 'FR', cityName: '리옹', lat: 45.7640, lng: 4.8357, transportToNext: 'train' },
      { countryCode: 'FR', cityName: '니스', lat: 43.7102, lng: 7.2620, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
  {
    id: 'city-uk-1',
    continent: '도시코스',
    title: '🇬🇧 영국 클래식 투어',
    description: '서울 ✈️ 런던 🚆 에든버러 🚆 맨체스터 ✈️ 서울',
    badge: '해리포터',
    badgeColor: 'slate',
    waypoints: [
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780, transportToNext: 'plane' },
      { countryCode: 'GB', cityName: '런던', lat: 51.5074, lng: -0.1278, transportToNext: 'train' },
      { countryCode: 'GB', cityName: '에든버러', lat: 55.9533, lng: -3.1883, transportToNext: 'train' },
      { countryCode: 'GB', cityName: '맨체스터', lat: 53.4808, lng: -2.2426, transportToNext: 'plane' },
      { countryCode: 'KR', cityName: '서울', lat: 37.5665, lng: 126.9780 },
    ],
  },
];

// Weather & Exchange Rate Types
interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
  emoji: string;
}

interface ExchangeRates {
  [currency: string]: number;
}

// Country code to currency mapping
const COUNTRY_CURRENCY: Record<string, string> = {
  KR: 'KRW', JP: 'JPY', US: 'USD', CA: 'CAD', MX: 'MXN',
  GB: 'GBP', FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR',
  NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR',
  GR: 'EUR', FI: 'EUR', HR: 'EUR', CH: 'CHF', NO: 'NOK',
  SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  TR: 'TRY', AU: 'AUD', NZ: 'NZD', CN: 'CNY', HK: 'HKD',
  TW: 'TWD', SG: 'SGD', TH: 'THB', VN: 'VND', PH: 'PHP',
  MY: 'MYR', ID: 'IDR', IN: 'INR', AE: 'AED', EG: 'EGP',
  ZA: 'ZAR', BR: 'BRL', AR: 'ARS', CL: 'CLP', PE: 'PEN',
  IS: 'ISK', MN: 'MNT', MA: 'MAD', GU: 'USD', MP: 'USD',
};

// Weather code to emoji mapping (WMO codes)
const getWeatherEmoji = (code: number): string => {
  if (code === 0) return '☀️'; // Clear sky
  if (code <= 3) return '⛅'; // Partly cloudy
  if (code <= 48) return '☁️'; // Foggy/Cloudy
  if (code <= 57) return '🌧️'; // Drizzle
  if (code <= 67) return '🌧️'; // Rain
  if (code <= 77) return '❄️'; // Snow
  if (code <= 82) return '🌧️'; // Rain showers
  if (code <= 86) return '❄️'; // Snow showers
  if (code >= 95) return '⛈️'; // Thunderstorm
  return '🌤️';
};

// Device ID for user identification (고정값 사용)
const FIXED_DEVICE_ID = 'device-e5bfoxfim6vmul3pkys';

const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  // 항상 고정 device_id 사용
  try {
    localStorage.setItem('earth-travel-device-id', FIXED_DEVICE_ID);
  } catch (e) {
    console.error('localStorage setItem failed:', e);
  }
  return FIXED_DEVICE_ID;
};

// localStorage 저장/불러오기
const saveToLocalStorage = (countries: VisitedCountry[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('earth-travel-visited', JSON.stringify(countries));
  }
};

const loadFromLocalStorage = (): VisitedCountry[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('earth-travel-visited');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};


// World Countries Database (204 countries: UN members + territories)
const WORLD_COUNTRIES: VisitedCountry[] = [
  // ===== 아시아 (49개) =====
  { code: 'KR', ko: '대한민국', en: 'South Korea', flag: '🇰🇷', continent: '아시아', lat: 36.5, lng: 127.8 },
  { code: 'KP', ko: '북한', en: 'North Korea', flag: '🇰🇵', continent: '아시아', lat: 40.3399, lng: 127.5101 },
  { code: 'JP', ko: '일본', en: 'Japan', flag: '🇯🇵', continent: '아시아', lat: 35.6762, lng: 139.6503 },
  { code: 'CN', ko: '중국', en: 'China', flag: '🇨🇳', continent: '아시아', lat: 35.8617, lng: 104.1954 },
  { code: 'TW', ko: '대만', en: 'Taiwan', flag: '🇹🇼', continent: '아시아', lat: 23.6978, lng: 120.9605 },
  { code: 'HK', ko: '홍콩', en: 'Hong Kong', flag: '🇭🇰', continent: '아시아', lat: 22.3193, lng: 114.1694 },
  { code: 'MO', ko: '마카오', en: 'Macau', flag: '🇲🇴', continent: '아시아', lat: 22.1987, lng: 113.5439 },
  { code: 'MN', ko: '몽골', en: 'Mongolia', flag: '🇲🇳', continent: '아시아', lat: 46.8625, lng: 103.8467 },
  { code: 'VN', ko: '베트남', en: 'Vietnam', flag: '🇻🇳', continent: '아시아', lat: 14.0583, lng: 108.2772 },
  { code: 'TH', ko: '태국', en: 'Thailand', flag: '🇹🇭', continent: '아시아', lat: 15.8700, lng: 100.9925 },
  { code: 'PH', ko: '필리핀', en: 'Philippines', flag: '🇵🇭', continent: '아시아', lat: 12.8797, lng: 121.7740 },
  { code: 'SG', ko: '싱가포르', en: 'Singapore', flag: '🇸🇬', continent: '아시아', lat: 1.3521, lng: 103.8198 },
  { code: 'MY', ko: '말레이시아', en: 'Malaysia', flag: '🇲🇾', continent: '아시아', lat: 4.2105, lng: 101.9758 },
  { code: 'ID', ko: '인도네시아', en: 'Indonesia', flag: '🇮🇩', continent: '아시아', lat: -0.7893, lng: 113.9213 },
  { code: 'BN', ko: '브루나이', en: 'Brunei', flag: '🇧🇳', continent: '아시아', lat: 4.5353, lng: 114.7277 },
  { code: 'TL', ko: '동티모르', en: 'Timor-Leste', flag: '🇹🇱', continent: '아시아', lat: -8.8742, lng: 125.7275 },
  { code: 'KH', ko: '캄보디아', en: 'Cambodia', flag: '🇰🇭', continent: '아시아', lat: 12.5657, lng: 104.9910 },
  { code: 'LA', ko: '라오스', en: 'Laos', flag: '🇱🇦', continent: '아시아', lat: 19.8563, lng: 102.4955 },
  { code: 'MM', ko: '미얀마', en: 'Myanmar', flag: '🇲🇲', continent: '아시아', lat: 21.9162, lng: 95.9560 },
  { code: 'IN', ko: '인도', en: 'India', flag: '🇮🇳', continent: '아시아', lat: 20.5937, lng: 78.9629 },
  { code: 'PK', ko: '파키스탄', en: 'Pakistan', flag: '🇵🇰', continent: '아시아', lat: 30.3753, lng: 69.3451 },
  { code: 'BD', ko: '방글라데시', en: 'Bangladesh', flag: '🇧🇩', continent: '아시아', lat: 23.6850, lng: 90.3563 },
  { code: 'LK', ko: '스리랑카', en: 'Sri Lanka', flag: '🇱🇰', continent: '아시아', lat: 7.8731, lng: 80.7718 },
  { code: 'NP', ko: '네팔', en: 'Nepal', flag: '🇳🇵', continent: '아시아', lat: 28.3949, lng: 84.1240 },
  { code: 'BT', ko: '부탄', en: 'Bhutan', flag: '🇧🇹', continent: '아시아', lat: 27.5142, lng: 90.4336 },
  { code: 'MV', ko: '몰디브', en: 'Maldives', flag: '🇲🇻', continent: '아시아', lat: 3.2028, lng: 73.2207 },
  { code: 'AF', ko: '아프가니스탄', en: 'Afghanistan', flag: '🇦🇫', continent: '아시아', lat: 33.9391, lng: 67.7100 },
  { code: 'IR', ko: '이란', en: 'Iran', flag: '🇮🇷', continent: '아시아', lat: 32.4279, lng: 53.6880 },
  { code: 'IQ', ko: '이라크', en: 'Iraq', flag: '🇮🇶', continent: '아시아', lat: 33.2232, lng: 43.6793 },
  { code: 'SA', ko: '사우디아라비아', en: 'Saudi Arabia', flag: '🇸🇦', continent: '아시아', lat: 23.8859, lng: 45.0792 },
  { code: 'AE', ko: '아랍에미리트', en: 'United Arab Emirates', flag: '🇦🇪', continent: '아시아', lat: 23.4241, lng: 53.8478 },
  { code: 'QA', ko: '카타르', en: 'Qatar', flag: '🇶🇦', continent: '아시아', lat: 25.3548, lng: 51.1839 },
  { code: 'KW', ko: '쿠웨이트', en: 'Kuwait', flag: '🇰🇼', continent: '아시아', lat: 29.3117, lng: 47.4818 },
  { code: 'BH', ko: '바레인', en: 'Bahrain', flag: '🇧🇭', continent: '아시아', lat: 26.0667, lng: 50.5577 },
  { code: 'OM', ko: '오만', en: 'Oman', flag: '🇴🇲', continent: '아시아', lat: 21.4735, lng: 55.9754 },
  { code: 'YE', ko: '예멘', en: 'Yemen', flag: '🇾🇪', continent: '아시아', lat: 15.5527, lng: 48.5164 },
  { code: 'JO', ko: '요르단', en: 'Jordan', flag: '🇯🇴', continent: '아시아', lat: 30.5852, lng: 36.2384 },
  { code: 'LB', ko: '레바논', en: 'Lebanon', flag: '🇱🇧', continent: '아시아', lat: 33.8547, lng: 35.8623 },
  { code: 'SY', ko: '시리아', en: 'Syria', flag: '🇸🇾', continent: '아시아', lat: 34.8021, lng: 38.9968 },
  { code: 'IL', ko: '이스라엘', en: 'Israel', flag: '🇮🇱', continent: '아시아', lat: 31.0461, lng: 34.8516 },
  { code: 'PS', ko: '팔레스타인', en: 'Palestine', flag: '🇵🇸', continent: '아시아', lat: 31.9522, lng: 35.2332 },
  { code: 'KZ', ko: '카자흐스탄', en: 'Kazakhstan', flag: '🇰🇿', continent: '아시아', lat: 48.0196, lng: 66.9237 },
  { code: 'UZ', ko: '우즈베키스탄', en: 'Uzbekistan', flag: '🇺🇿', continent: '아시아', lat: 41.3775, lng: 64.5853 },
  { code: 'TM', ko: '투르크메니스탄', en: 'Turkmenistan', flag: '🇹🇲', continent: '아시아', lat: 38.9697, lng: 59.5563 },
  { code: 'TJ', ko: '타지키스탄', en: 'Tajikistan', flag: '🇹🇯', continent: '아시아', lat: 38.8610, lng: 71.2761 },
  { code: 'KG', ko: '키르기스스탄', en: 'Kyrgyzstan', flag: '🇰🇬', continent: '아시아', lat: 41.2044, lng: 74.7661 },
  { code: 'AZ', ko: '아제르바이잔', en: 'Azerbaijan', flag: '🇦🇿', continent: '아시아', lat: 40.1431, lng: 47.5769 },
  { code: 'GE', ko: '조지아', en: 'Georgia', flag: '🇬🇪', continent: '아시아', lat: 42.3154, lng: 43.3569 },
  { code: 'AM', ko: '아르메니아', en: 'Armenia', flag: '🇦🇲', continent: '아시아', lat: 40.0691, lng: 45.0382 },
  // ===== 유럽 (45개) =====
  { code: 'FR', ko: '프랑스', en: 'France', flag: '🇫🇷', continent: '유럽', lat: 46.2276, lng: 2.2137 },
  { code: 'DE', ko: '독일', en: 'Germany', flag: '🇩🇪', continent: '유럽', lat: 51.1657, lng: 10.4515 },
  { code: 'GB', ko: '영국', en: 'United Kingdom', flag: '🇬🇧', continent: '유럽', lat: 55.3781, lng: -3.4360 },
  { code: 'IT', ko: '이탈리아', en: 'Italy', flag: '🇮🇹', continent: '유럽', lat: 41.8719, lng: 12.5674 },
  { code: 'ES', ko: '스페인', en: 'Spain', flag: '🇪🇸', continent: '유럽', lat: 40.4637, lng: -3.7492 },
  { code: 'PT', ko: '포르투갈', en: 'Portugal', flag: '🇵🇹', continent: '유럽', lat: 39.3999, lng: -8.2245 },
  { code: 'NL', ko: '네덜란드', en: 'Netherlands', flag: '🇳🇱', continent: '유럽', lat: 52.1326, lng: 5.2913 },
  { code: 'BE', ko: '벨기에', en: 'Belgium', flag: '🇧🇪', continent: '유럽', lat: 50.5039, lng: 4.4699 },
  { code: 'LU', ko: '룩셈부르크', en: 'Luxembourg', flag: '🇱🇺', continent: '유럽', lat: 49.8153, lng: 6.1296 },
  { code: 'CH', ko: '스위스', en: 'Switzerland', flag: '🇨🇭', continent: '유럽', lat: 46.8182, lng: 8.2275 },
  { code: 'AT', ko: '오스트리아', en: 'Austria', flag: '🇦🇹', continent: '유럽', lat: 47.5162, lng: 14.5501 },
  { code: 'IE', ko: '아일랜드', en: 'Ireland', flag: '🇮🇪', continent: '유럽', lat: 53.1424, lng: -7.6921 },
  { code: 'IS', ko: '아이슬란드', en: 'Iceland', flag: '🇮🇸', continent: '유럽', lat: 64.9631, lng: -19.0208 },
  { code: 'NO', ko: '노르웨이', en: 'Norway', flag: '🇳🇴', continent: '유럽', lat: 60.4720, lng: 8.4689 },
  { code: 'SE', ko: '스웨덴', en: 'Sweden', flag: '🇸🇪', continent: '유럽', lat: 60.1282, lng: 18.6435 },
  { code: 'FI', ko: '핀란드', en: 'Finland', flag: '🇫🇮', continent: '유럽', lat: 61.9241, lng: 25.7482 },
  { code: 'DK', ko: '덴마크', en: 'Denmark', flag: '🇩🇰', continent: '유럽', lat: 56.2639, lng: 9.5018 },
  { code: 'PL', ko: '폴란드', en: 'Poland', flag: '🇵🇱', continent: '유럽', lat: 51.9194, lng: 19.1451 },
  { code: 'CZ', ko: '체코', en: 'Czech Republic', flag: '🇨🇿', continent: '유럽', lat: 49.8175, lng: 15.4730 },
  { code: 'SK', ko: '슬로바키아', en: 'Slovakia', flag: '🇸🇰', continent: '유럽', lat: 48.6690, lng: 19.6990 },
  { code: 'HU', ko: '헝가리', en: 'Hungary', flag: '🇭🇺', continent: '유럽', lat: 47.1625, lng: 19.5033 },
  { code: 'RO', ko: '루마니아', en: 'Romania', flag: '🇷🇴', continent: '유럽', lat: 45.9432, lng: 24.9668 },
  { code: 'BG', ko: '불가리아', en: 'Bulgaria', flag: '🇧🇬', continent: '유럽', lat: 42.7339, lng: 25.4858 },
  { code: 'GR', ko: '그리스', en: 'Greece', flag: '🇬🇷', continent: '유럽', lat: 39.0742, lng: 21.8243 },
  { code: 'TR', ko: '튀르키예', en: 'Turkey', flag: '🇹🇷', continent: '유럽', lat: 38.9637, lng: 35.2433 },
  { code: 'CY', ko: '키프로스', en: 'Cyprus', flag: '🇨🇾', continent: '유럽', lat: 35.1264, lng: 33.4299 },
  { code: 'MT', ko: '몰타', en: 'Malta', flag: '🇲🇹', continent: '유럽', lat: 35.9375, lng: 14.3754 },
  { code: 'HR', ko: '크로아티아', en: 'Croatia', flag: '🇭🇷', continent: '유럽', lat: 45.1000, lng: 15.2000 },
  { code: 'SI', ko: '슬로베니아', en: 'Slovenia', flag: '🇸🇮', continent: '유럽', lat: 46.1512, lng: 14.9955 },
  { code: 'BA', ko: '보스니아헤르체고비나', en: 'Bosnia and Herzegovina', flag: '🇧🇦', continent: '유럽', lat: 43.9159, lng: 17.6791 },
  { code: 'RS', ko: '세르비아', en: 'Serbia', flag: '🇷🇸', continent: '유럽', lat: 44.0165, lng: 21.0059 },
  { code: 'ME', ko: '몬테네그로', en: 'Montenegro', flag: '🇲🇪', continent: '유럽', lat: 42.7087, lng: 19.3744 },
  { code: 'MK', ko: '북마케도니아', en: 'North Macedonia', flag: '🇲🇰', continent: '유럽', lat: 41.5124, lng: 21.7453 },
  { code: 'AL', ko: '알바니아', en: 'Albania', flag: '🇦🇱', continent: '유럽', lat: 41.1533, lng: 20.1683 },
  { code: 'XK', ko: '코소보', en: 'Kosovo', flag: '🇽🇰', continent: '유럽', lat: 42.6026, lng: 20.9030 },
  { code: 'EE', ko: '에스토니아', en: 'Estonia', flag: '🇪🇪', continent: '유럽', lat: 58.5953, lng: 25.0136 },
  { code: 'LV', ko: '라트비아', en: 'Latvia', flag: '🇱🇻', continent: '유럽', lat: 56.8796, lng: 24.6032 },
  { code: 'LT', ko: '리투아니아', en: 'Lithuania', flag: '🇱🇹', continent: '유럽', lat: 55.1694, lng: 23.8813 },
  { code: 'BY', ko: '벨라루스', en: 'Belarus', flag: '🇧🇾', continent: '유럽', lat: 53.7098, lng: 27.9534 },
  { code: 'UA', ko: '우크라이나', en: 'Ukraine', flag: '🇺🇦', continent: '유럽', lat: 48.3794, lng: 31.1656 },
  { code: 'MD', ko: '몰도바', en: 'Moldova', flag: '🇲🇩', continent: '유럽', lat: 47.4116, lng: 28.3699 },
  { code: 'RU', ko: '러시아', en: 'Russia', flag: '🇷🇺', continent: '유럽', lat: 61.5240, lng: 105.3188 },
  { code: 'MC', ko: '모나코', en: 'Monaco', flag: '🇲🇨', continent: '유럽', lat: 43.7384, lng: 7.4246 },
  { code: 'AD', ko: '안도라', en: 'Andorra', flag: '🇦🇩', continent: '유럽', lat: 42.5063, lng: 1.5218 },
  { code: 'SM', ko: '산마리노', en: 'San Marino', flag: '🇸🇲', continent: '유럽', lat: 43.9424, lng: 12.4578 },
  { code: 'VA', ko: '바티칸', en: 'Vatican City', flag: '🇻🇦', continent: '유럽', lat: 41.9029, lng: 12.4534 },
  { code: 'LI', ko: '리히텐슈타인', en: 'Liechtenstein', flag: '🇱🇮', continent: '유럽', lat: 47.1660, lng: 9.5554 },
  // ===== 아메리카 (35개) =====
  { code: 'US', ko: '미국', en: 'United States', flag: '🇺🇸', continent: '아메리카', lat: 37.0902, lng: -95.7129 },
  { code: 'CA', ko: '캐나다', en: 'Canada', flag: '🇨🇦', continent: '아메리카', lat: 56.1304, lng: -106.3468 },
  { code: 'MX', ko: '멕시코', en: 'Mexico', flag: '🇲🇽', continent: '아메리카', lat: 23.6345, lng: -102.5528 },
  { code: 'GT', ko: '과테말라', en: 'Guatemala', flag: '🇬🇹', continent: '아메리카', lat: 15.7835, lng: -90.2308 },
  { code: 'BZ', ko: '벨리즈', en: 'Belize', flag: '🇧🇿', continent: '아메리카', lat: 17.1899, lng: -88.4976 },
  { code: 'SV', ko: '엘살바도르', en: 'El Salvador', flag: '🇸🇻', continent: '아메리카', lat: 13.7942, lng: -88.8965 },
  { code: 'HN', ko: '온두라스', en: 'Honduras', flag: '🇭🇳', continent: '아메리카', lat: 15.2000, lng: -86.2419 },
  { code: 'NI', ko: '니카라과', en: 'Nicaragua', flag: '🇳🇮', continent: '아메리카', lat: 12.8654, lng: -85.2072 },
  { code: 'CR', ko: '코스타리카', en: 'Costa Rica', flag: '🇨🇷', continent: '아메리카', lat: 9.7489, lng: -83.7534 },
  { code: 'PA', ko: '파나마', en: 'Panama', flag: '🇵🇦', continent: '아메리카', lat: 8.5380, lng: -80.7821 },
  { code: 'CU', ko: '쿠바', en: 'Cuba', flag: '🇨🇺', continent: '아메리카', lat: 21.5218, lng: -77.7812 },
  { code: 'JM', ko: '자메이카', en: 'Jamaica', flag: '🇯🇲', continent: '아메리카', lat: 18.1096, lng: -77.2975 },
  { code: 'HT', ko: '아이티', en: 'Haiti', flag: '🇭🇹', continent: '아메리카', lat: 18.9712, lng: -72.2852 },
  { code: 'DO', ko: '도미니카공화국', en: 'Dominican Republic', flag: '🇩🇴', continent: '아메리카', lat: 18.7357, lng: -70.1627 },
  { code: 'PR', ko: '푸에르토리코', en: 'Puerto Rico', flag: '🇵🇷', continent: '아메리카', lat: 18.2208, lng: -66.5901 },
  { code: 'BS', ko: '바하마', en: 'Bahamas', flag: '🇧🇸', continent: '아메리카', lat: 25.0343, lng: -77.3963 },
  { code: 'BB', ko: '바베이도스', en: 'Barbados', flag: '🇧🇧', continent: '아메리카', lat: 13.1939, lng: -59.5432 },
  { code: 'TT', ko: '트리니다드토바고', en: 'Trinidad and Tobago', flag: '🇹🇹', continent: '아메리카', lat: 10.6918, lng: -61.2225 },
  { code: 'LC', ko: '세인트루시아', en: 'Saint Lucia', flag: '🇱🇨', continent: '아메리카', lat: 13.9094, lng: -60.9789 },
  { code: 'GD', ko: '그레나다', en: 'Grenada', flag: '🇬🇩', continent: '아메리카', lat: 12.1165, lng: -61.6790 },
  { code: 'VC', ko: '세인트빈센트그레나딘', en: 'Saint Vincent', flag: '🇻🇨', continent: '아메리카', lat: 12.9843, lng: -61.2872 },
  { code: 'AG', ko: '앤티가바부다', en: 'Antigua and Barbuda', flag: '🇦🇬', continent: '아메리카', lat: 17.0608, lng: -61.7964 },
  { code: 'DM', ko: '도미니카연방', en: 'Dominica', flag: '🇩🇲', continent: '아메리카', lat: 15.4150, lng: -61.3710 },
  { code: 'KN', ko: '세인트키츠네비스', en: 'Saint Kitts and Nevis', flag: '🇰🇳', continent: '아메리카', lat: 17.3578, lng: -62.7830 },
  { code: 'CO', ko: '콜롬비아', en: 'Colombia', flag: '🇨🇴', continent: '아메리카', lat: 4.5709, lng: -74.2973 },
  { code: 'VE', ko: '베네수엘라', en: 'Venezuela', flag: '🇻🇪', continent: '아메리카', lat: 6.4238, lng: -66.5897 },
  { code: 'EC', ko: '에콰도르', en: 'Ecuador', flag: '🇪🇨', continent: '아메리카', lat: -1.8312, lng: -78.1834 },
  { code: 'PE', ko: '페루', en: 'Peru', flag: '🇵🇪', continent: '아메리카', lat: -9.1899, lng: -75.0152 },
  { code: 'BO', ko: '볼리비아', en: 'Bolivia', flag: '🇧🇴', continent: '아메리카', lat: -16.2902, lng: -63.5887 },
  { code: 'BR', ko: '브라질', en: 'Brazil', flag: '🇧🇷', continent: '아메리카', lat: -14.2350, lng: -51.9253 },
  { code: 'AR', ko: '아르헨티나', en: 'Argentina', flag: '🇦🇷', continent: '아메리카', lat: -38.4161, lng: -63.6167 },
  { code: 'CL', ko: '칠레', en: 'Chile', flag: '🇨🇱', continent: '아메리카', lat: -35.6751, lng: -71.5430 },
  { code: 'UY', ko: '우루과이', en: 'Uruguay', flag: '🇺🇾', continent: '아메리카', lat: -32.5228, lng: -55.7658 },
  { code: 'PY', ko: '파라과이', en: 'Paraguay', flag: '🇵🇾', continent: '아메리카', lat: -23.4425, lng: -58.4438 },
  { code: 'GY', ko: '가이아나', en: 'Guyana', flag: '🇬🇾', continent: '아메리카', lat: 4.8604, lng: -58.9302 },
  { code: 'SR', ko: '수리남', en: 'Suriname', flag: '🇸🇷', continent: '아메리카', lat: 3.9193, lng: -56.0278 },
  // ===== 오세아니아 (14개) =====
  { code: 'AU', ko: '호주', en: 'Australia', flag: '🇦🇺', continent: '오세아니아', lat: -25.2744, lng: 133.7751 },
  { code: 'NZ', ko: '뉴질랜드', en: 'New Zealand', flag: '🇳🇿', continent: '오세아니아', lat: -40.9006, lng: 174.8860 },
  { code: 'GU', ko: '괌', en: 'Guam', flag: '🇬🇺', continent: '오세아니아', lat: 13.4443, lng: 144.7937 },
  { code: 'MP', ko: '사이판', en: 'Saipan', flag: '🇲🇵', continent: '오세아니아', lat: 15.1833, lng: 145.7500 },
  { code: 'FJ', ko: '피지', en: 'Fiji', flag: '🇫🇯', continent: '오세아니아', lat: -17.7134, lng: 178.0650 },
  { code: 'PG', ko: '파푸아뉴기니', en: 'Papua New Guinea', flag: '🇵🇬', continent: '오세아니아', lat: -6.3150, lng: 143.9555 },
  { code: 'SB', ko: '솔로몬제도', en: 'Solomon Islands', flag: '🇸🇧', continent: '오세아니아', lat: -9.6457, lng: 160.1562 },
  { code: 'VU', ko: '바누아투', en: 'Vanuatu', flag: '🇻🇺', continent: '오세아니아', lat: -15.3767, lng: 166.9592 },
  { code: 'NC', ko: '뉴칼레도니아', en: 'New Caledonia', flag: '🇳🇨', continent: '오세아니아', lat: -20.9043, lng: 165.6180 },
  { code: 'PF', ko: '프랑스령폴리네시아', en: 'French Polynesia', flag: '🇵🇫', continent: '오세아니아', lat: -17.6797, lng: -149.4068 },
  { code: 'WS', ko: '사모아', en: 'Samoa', flag: '🇼🇸', continent: '오세아니아', lat: -13.7590, lng: -172.1046 },
  { code: 'TO', ko: '통가', en: 'Tonga', flag: '🇹🇴', continent: '오세아니아', lat: -21.1790, lng: -175.1982 },
  { code: 'PW', ko: '팔라우', en: 'Palau', flag: '🇵🇼', continent: '오세아니아', lat: 7.5150, lng: 134.5825 },
  { code: 'MH', ko: '마셜제도', en: 'Marshall Islands', flag: '🇲🇭', continent: '오세아니아', lat: 7.1315, lng: 171.1845 },
  { code: 'FM', ko: '미크로네시아', en: 'Micronesia', flag: '🇫🇲', continent: '오세아니아', lat: 7.4256, lng: 150.5508 },
  { code: 'KI', ko: '키리바시', en: 'Kiribati', flag: '🇰🇮', continent: '오세아니아', lat: -3.3704, lng: -168.7340 },
  { code: 'NR', ko: '나우루', en: 'Nauru', flag: '🇳🇷', continent: '오세아니아', lat: -0.5228, lng: 166.9315 },
  { code: 'TV', ko: '투발루', en: 'Tuvalu', flag: '🇹🇻', continent: '오세아니아', lat: -7.1095, lng: 179.1940 },
  // ===== 아프리카 (54개) =====
  { code: 'EG', ko: '이집트', en: 'Egypt', flag: '🇪🇬', continent: '아프리카', lat: 26.8206, lng: 30.8025 },
  { code: 'ZA', ko: '남아프리카공화국', en: 'South Africa', flag: '🇿🇦', continent: '아프리카', lat: -30.5595, lng: 22.9375 },
  { code: 'MA', ko: '모로코', en: 'Morocco', flag: '🇲🇦', continent: '아프리카', lat: 31.7917, lng: -7.0926 },
  { code: 'TN', ko: '튀니지', en: 'Tunisia', flag: '🇹🇳', continent: '아프리카', lat: 33.8869, lng: 9.5375 },
  { code: 'DZ', ko: '알제리', en: 'Algeria', flag: '🇩🇿', continent: '아프리카', lat: 28.0339, lng: 1.6596 },
  { code: 'LY', ko: '리비아', en: 'Libya', flag: '🇱🇾', continent: '아프리카', lat: 26.3351, lng: 17.2283 },
  { code: 'SD', ko: '수단', en: 'Sudan', flag: '🇸🇩', continent: '아프리카', lat: 12.8628, lng: 30.2176 },
  { code: 'SS', ko: '남수단', en: 'South Sudan', flag: '🇸🇸', continent: '아프리카', lat: 6.8770, lng: 31.3070 },
  { code: 'ET', ko: '에티오피아', en: 'Ethiopia', flag: '🇪🇹', continent: '아프리카', lat: 9.1450, lng: 40.4897 },
  { code: 'ER', ko: '에리트레아', en: 'Eritrea', flag: '🇪🇷', continent: '아프리카', lat: 15.1794, lng: 39.7823 },
  { code: 'DJ', ko: '지부티', en: 'Djibouti', flag: '🇩🇯', continent: '아프리카', lat: 11.8251, lng: 42.5903 },
  { code: 'SO', ko: '소말리아', en: 'Somalia', flag: '🇸🇴', continent: '아프리카', lat: 5.1521, lng: 46.1996 },
  { code: 'KE', ko: '케냐', en: 'Kenya', flag: '🇰🇪', continent: '아프리카', lat: -0.0236, lng: 37.9062 },
  { code: 'UG', ko: '우간다', en: 'Uganda', flag: '🇺🇬', continent: '아프리카', lat: 1.3733, lng: 32.2903 },
  { code: 'TZ', ko: '탄자니아', en: 'Tanzania', flag: '🇹🇿', continent: '아프리카', lat: -6.3690, lng: 34.8888 },
  { code: 'RW', ko: '르완다', en: 'Rwanda', flag: '🇷🇼', continent: '아프리카', lat: -1.9403, lng: 29.8739 },
  { code: 'BI', ko: '부룬디', en: 'Burundi', flag: '🇧🇮', continent: '아프리카', lat: -3.3731, lng: 29.9189 },
  { code: 'CD', ko: '콩고민주공화국', en: 'DR Congo', flag: '🇨🇩', continent: '아프리카', lat: -4.0383, lng: 21.7587 },
  { code: 'CG', ko: '콩고공화국', en: 'Republic of Congo', flag: '🇨🇬', continent: '아프리카', lat: -0.2280, lng: 15.8277 },
  { code: 'GA', ko: '가봉', en: 'Gabon', flag: '🇬🇦', continent: '아프리카', lat: -0.8037, lng: 11.6094 },
  { code: 'GQ', ko: '적도기니', en: 'Equatorial Guinea', flag: '🇬🇶', continent: '아프리카', lat: 1.6508, lng: 10.2679 },
  { code: 'CM', ko: '카메룬', en: 'Cameroon', flag: '🇨🇲', continent: '아프리카', lat: 7.3697, lng: 12.3547 },
  { code: 'CF', ko: '중앙아프리카공화국', en: 'Central African Republic', flag: '🇨🇫', continent: '아프리카', lat: 6.6111, lng: 20.9394 },
  { code: 'TD', ko: '차드', en: 'Chad', flag: '🇹🇩', continent: '아프리카', lat: 15.4542, lng: 18.7322 },
  { code: 'NE', ko: '니제르', en: 'Niger', flag: '🇳🇪', continent: '아프리카', lat: 17.6078, lng: 8.0817 },
  { code: 'NG', ko: '나이지리아', en: 'Nigeria', flag: '🇳🇬', continent: '아프리카', lat: 9.0820, lng: 8.6753 },
  { code: 'BJ', ko: '베냉', en: 'Benin', flag: '🇧🇯', continent: '아프리카', lat: 9.3077, lng: 2.3158 },
  { code: 'TG', ko: '토고', en: 'Togo', flag: '🇹🇬', continent: '아프리카', lat: 8.6195, lng: 0.8248 },
  { code: 'GH', ko: '가나', en: 'Ghana', flag: '🇬🇭', continent: '아프리카', lat: 7.9465, lng: -1.0232 },
  { code: 'CI', ko: '코트디부아르', en: 'Ivory Coast', flag: '🇨🇮', continent: '아프리카', lat: 7.5400, lng: -5.5471 },
  { code: 'LR', ko: '라이베리아', en: 'Liberia', flag: '🇱🇷', continent: '아프리카', lat: 6.4281, lng: -9.4295 },
  { code: 'SL', ko: '시에라리온', en: 'Sierra Leone', flag: '🇸🇱', continent: '아프리카', lat: 8.4606, lng: -11.7799 },
  { code: 'GN', ko: '기니', en: 'Guinea', flag: '🇬🇳', continent: '아프리카', lat: 9.9456, lng: -9.6966 },
  { code: 'GW', ko: '기니비사우', en: 'Guinea-Bissau', flag: '🇬🇼', continent: '아프리카', lat: 11.8037, lng: -15.1804 },
  { code: 'SN', ko: '세네갈', en: 'Senegal', flag: '🇸🇳', continent: '아프리카', lat: 14.4974, lng: -14.4524 },
  { code: 'GM', ko: '감비아', en: 'Gambia', flag: '🇬🇲', continent: '아프리카', lat: 13.4432, lng: -15.3101 },
  { code: 'MR', ko: '모리타니', en: 'Mauritania', flag: '🇲🇷', continent: '아프리카', lat: 21.0079, lng: -10.9408 },
  { code: 'ML', ko: '말리', en: 'Mali', flag: '🇲🇱', continent: '아프리카', lat: 17.5707, lng: -3.9962 },
  { code: 'BF', ko: '부르키나파소', en: 'Burkina Faso', flag: '🇧🇫', continent: '아프리카', lat: 12.2383, lng: -1.5616 },
  { code: 'CV', ko: '카보베르데', en: 'Cape Verde', flag: '🇨🇻', continent: '아프리카', lat: 16.5388, lng: -23.0418 },
  { code: 'AO', ko: '앙골라', en: 'Angola', flag: '🇦🇴', continent: '아프리카', lat: -11.2027, lng: 17.8739 },
  { code: 'ZM', ko: '잠비아', en: 'Zambia', flag: '🇿🇲', continent: '아프리카', lat: -13.1339, lng: 27.8493 },
  { code: 'ZW', ko: '짐바브웨', en: 'Zimbabwe', flag: '🇿🇼', continent: '아프리카', lat: -19.0154, lng: 29.1549 },
  { code: 'MW', ko: '말라위', en: 'Malawi', flag: '🇲🇼', continent: '아프리카', lat: -13.2543, lng: 34.3015 },
  { code: 'MZ', ko: '모잠비크', en: 'Mozambique', flag: '🇲🇿', continent: '아프리카', lat: -18.6657, lng: 35.5296 },
  { code: 'BW', ko: '보츠와나', en: 'Botswana', flag: '🇧🇼', continent: '아프리카', lat: -22.3285, lng: 24.6849 },
  { code: 'NA', ko: '나미비아', en: 'Namibia', flag: '🇳🇦', continent: '아프리카', lat: -22.9576, lng: 18.4904 },
  { code: 'SZ', ko: '에스와티니', en: 'Eswatini', flag: '🇸🇿', continent: '아프리카', lat: -26.5225, lng: 31.4659 },
  { code: 'LS', ko: '레소토', en: 'Lesotho', flag: '🇱🇸', continent: '아프리카', lat: -29.6100, lng: 28.2336 },
  { code: 'MG', ko: '마다가스카르', en: 'Madagascar', flag: '🇲🇬', continent: '아프리카', lat: -18.7669, lng: 46.8691 },
  { code: 'MU', ko: '모리셔스', en: 'Mauritius', flag: '🇲🇺', continent: '아프리카', lat: -20.3484, lng: 57.5522 },
  { code: 'SC', ko: '세이셸', en: 'Seychelles', flag: '🇸🇨', continent: '아프리카', lat: -4.6796, lng: 55.4920 },
  { code: 'KM', ko: '코모로', en: 'Comoros', flag: '🇰🇲', continent: '아프리카', lat: -11.6455, lng: 43.3333 },
  { code: 'ST', ko: '상투메프린시페', en: 'Sao Tome and Principe', flag: '🇸🇹', continent: '아프리카', lat: 0.1864, lng: 6.6131 },
];

// Cruise Presets
const CRUISE_PRESETS: CruisePreset[] = [
  {
    id: 'west-med-classic',
    region: '서부 지중해',
    name: '서부 지중해 클래식 7박 8일 크루즈',
    subtitle: 'MSC / 코스타 대표 항로 (바르셀로나 출발)',
    badge: '인기 크루즈',
    recommendedMode: 'boat',
    curvature: 0.08,
    waypoints: [
      { id: 'p1', name: '바르셀로나 (Barcelona)', country: '스페인', lat: 41.3879, lng: 2.1699, day: 'Day 1 (출항)' },
      { id: 'p2', name: '마르세유 (Marseille)', country: '프랑스', lat: 43.2965, lng: 5.3698, day: 'Day 2' },
      { id: 'p3', name: '제노바 (Genoa)', country: '이탈리아', lat: 44.4056, lng: 8.9463, day: 'Day 3' },
      { id: 'p4', name: '치비타베키아 / 로마 (Civitavecchia)', country: '이탈리아', lat: 42.0924, lng: 11.7954, day: 'Day 4' },
      { id: 'p5', name: '팔레르모 / 시칠리아 (Palermo)', country: '이탈리아', lat: 38.1157, lng: 13.3615, day: 'Day 5' },
      { id: 'p6', name: '이비자 (Ibiza)', country: '스페인', lat: 38.9067, lng: 1.4206, day: 'Day 6' },
      { id: 'p7', name: '바르셀로나 (Barcelona)', country: '스페인', lat: 41.3879, lng: 2.1699, day: 'Day 7-8 (귀항)' }
    ]
  },
  {
    id: 'east-med-greek-isles',
    region: '동부 지중해',
    name: '동부 지중해 & 그리스 섬 일주 7박 8일',
    subtitle: '로얄캐리비안 / NCL 대표 항로 (아테네 피레우스 출발)',
    badge: '로맨틱 1위',
    recommendedMode: 'boat',
    curvature: 0.09,
    waypoints: [
      { id: 'em1', name: '피레우스 / 아테네 (Piraeus)', country: '그리스', lat: 37.9429, lng: 23.6469, day: 'Day 1 (출항)' },
      { id: 'em2', name: '미코노스 (Mykonos)', country: '그리스', lat: 37.4467, lng: 25.3289, day: 'Day 2' },
      { id: 'em3', name: '쿠샤다시 / 에페소스 (Kusadasi)', country: '튀르키예', lat: 37.8579, lng: 27.2610, day: 'Day 3' },
      { id: 'em4', name: '산토리니 (Santorini)', country: '그리스', lat: 36.4166, lng: 25.4324, day: 'Day 4' },
      { id: 'em5', name: '로도스 (Rhodes)', country: '그리스', lat: 36.4447, lng: 28.2278, day: 'Day 5' },
      { id: 'em6', name: '헤라클리온 / 크레타 (Heraklion)', country: '그리스', lat: 35.3418, lng: 25.1482, day: 'Day 6' },
      { id: 'em7', name: '피레우스 / 아테네 (Piraeus)', country: '그리스', lat: 37.9429, lng: 23.6469, day: 'Day 7 (귀항)' }
    ]
  },
  {
    id: 'caribbean-paradise',
    region: '카리브해',
    name: '동부 카리브해 파라다이스 크루즈',
    subtitle: '마이애미 출항 • 바하마 & 버진아일랜드 & 푸에르토리코',
    badge: '세계 최대 크루즈',
    recommendedMode: 'boat',
    curvature: 0.07,
    waypoints: [
      { id: 'cb1', name: '마이애미 (Miami)', country: '미국 플로리다', lat: 25.7743, lng: -80.1937, day: 'Day 1 (출항)' },
      { id: 'cb2', name: '나소 (Nassau)', country: '바하마', lat: 25.0780, lng: -77.3384, day: 'Day 2' },
      { id: 'cb3', name: '샬럿아말리에 (St. Thomas)', country: '미국령 버진아일랜드', lat: 18.3419, lng: -64.9307, day: 'Day 4' },
      { id: 'cb4', name: '필립스버그 (St. Maarten)', country: '신트마르턴', lat: 18.0267, lng: -63.0458, day: 'Day 5' },
      { id: 'cb5', name: '산후안 (San Juan)', country: '푸에르토리코', lat: 18.4655, lng: -66.1057, day: 'Day 6' },
      { id: 'cb6', name: '마이애미 (Miami)', country: '미국 플로리다', lat: 25.7743, lng: -80.1937, day: 'Day 8 (귀항)' }
    ]
  },
  {
    id: 'alaska-glaciers',
    region: '알래스카',
    name: '알래스카 인사이드 패시지 빙하 크루즈',
    subtitle: '프린세스 / 홀랜드아메리카 대표 북미 대자연 항로',
    badge: '빙하 & 야생동물',
    recommendedMode: 'boat',
    curvature: 0.05,
    waypoints: [
      { id: 'ak1', name: '시애틀 (Seattle)', country: '미국 워싱턴', lat: 47.6062, lng: -122.3321, day: 'Day 1 (출항)' },
      { id: 'ak2', name: '케치칸 (Ketchikan)', country: '미국 알래스카', lat: 55.3422, lng: -131.6461, day: 'Day 3' },
      { id: 'ak3', name: '주노 (Juneau / 멘덴홀)', country: '미국 알래스카', lat: 58.3019, lng: -134.4197, day: 'Day 4' },
      { id: 'ak4', name: '스캐그웨이 (Skagway)', country: '미국 알래스카', lat: 59.4583, lng: -135.3139, day: 'Day 5' },
      { id: 'ak5', name: '글레이셔 베이 (Glacier Bay)', country: '국립공원 해상선회', lat: 58.6658, lng: -136.9002, day: 'Day 6 (빙하)' },
      { id: 'ak6', name: '빅토리아 (Victoria)', country: '캐나다 BC', lat: 48.4284, lng: -123.3656, day: 'Day 7' },
      { id: 'ak7', name: '시애틀 (Seattle)', country: '미국 워싱턴', lat: 47.6062, lng: -122.3321, day: 'Day 8 (귀항)' }
    ]
  },
  {
    id: 'norway-fjords',
    region: '북유럽',
    name: '노르웨이 대자연 피오르드 7박 항로',
    subtitle: '게이랑에르 & 송네피오르드 절벽 해상 탐험',
    badge: '세계 자연유산',
    recommendedMode: 'boat',
    curvature: 0.06,
    waypoints: [
      { id: 'nw1', name: '베르겐 (Bergen)', country: '노르웨이', lat: 60.3913, lng: 5.3221, day: 'Day 1 (출항)' },
      { id: 'nw2', name: '올레순 (Ålesund)', country: '노르웨이', lat: 62.4722, lng: 6.1495, day: 'Day 2' },
      { id: 'nw3', name: '게이랑에르 (Geiranger)', country: '노르웨이 피오르', lat: 62.1008, lng: 7.2059, day: 'Day 3' },
      { id: 'nw4', name: '플롬 (Flåm / 송네피오르)', country: '노르웨이', lat: 60.8608, lng: 7.1134, day: 'Day 4' },
      { id: 'nw5', name: '스타방에르 (Stavanger)', country: '노르웨이', lat: 58.9699, lng: 5.7331, day: 'Day 5' },
      { id: 'nw6', name: '베르겐 (Bergen)', country: '노르웨이', lat: 60.3913, lng: 5.3221, day: 'Day 7 (귀항)' }
    ]
  },
  {
    id: 'hawaii-islands',
    region: '하와이',
    name: '하와이 4대 섬 일주 7박 크루즈',
    subtitle: 'NCL 프라이드 오브 아메리카 (오아후•마우이•빅아일랜드•카우아이)',
    badge: '사계절 휴양',
    recommendedMode: 'boat',
    curvature: 0.07,
    waypoints: [
      { id: 'hw1', name: '호놀룰루 / 오아후 (Honolulu)', country: '하와이', lat: 21.3069, lng: -157.8583, day: 'Day 1 (출항)' },
      { id: 'hw2', name: '카훌루이 / 마우이 (Kahului)', country: '하와이', lat: 20.8893, lng: -156.4729, day: 'Day 2' },
      { id: 'hw3', name: '힐로 / 빅아일랜드 (Hilo)', country: '하와이', lat: 19.7297, lng: -155.0900, day: 'Day 4' },
      { id: 'hw4', name: '코나 / 빅아일랜드 (Kona)', country: '하와이', lat: 19.6399, lng: -155.9969, day: 'Day 5' },
      { id: 'hw5', name: '나윌리와일리 / 카우아이 (Nawiliwili)', country: '하와이', lat: 21.9575, lng: -159.3558, day: 'Day 6' },
      { id: 'hw6', name: '호놀룰루 / 오아후 (Honolulu)', country: '하와이', lat: 21.3069, lng: -157.8583, day: 'Day 7 (귀항)' }
    ]
  },
  {
    id: 'southeast-asia',
    region: '동남아',
    name: '싱가포르 & 말레이시아 • 태국 5박 크루즈',
    subtitle: '로얄캐리비안 스펙트럼호 대표 아시아 항로 (페낭 & 푸껫)',
    badge: '가장 가까운 크루즈',
    recommendedMode: 'boat',
    curvature: 0.08,
    waypoints: [
      { id: 'sea1', name: '싱가포르 (Singapore)', country: '싱가포르', lat: 1.2847, lng: 103.8610, day: 'Day 1 (출항)' },
      { id: 'sea2', name: '페낭 (Penang)', country: '말레이시아', lat: 5.4164, lng: 100.3327, day: 'Day 2' },
      { id: 'sea3', name: '푸껫 (Phuket)', country: '태국', lat: 7.8804, lng: 98.3923, day: 'Day 3' },
      { id: 'sea4', name: '포트클랑 / 쿠알라룸푸르 (Port Klang)', country: '말레이시아', lat: 2.9999, lng: 101.3928, day: 'Day 4' },
      { id: 'sea5', name: '싱가포르 (Singapore)', country: '싱가포르', lat: 1.2847, lng: 103.8610, day: 'Day 5 (귀항)' }
    ]
  }
];

const CRUISE_REGIONS = ['전체', '동부 지중해', '카리브해', '알래스카', '서부 지중해', '북유럽', '하와이', '동남아'];

const COUNTRY_INFO_MAP: Record<string, CountryInfo> = {
  '이탈리아': { code: 'IT', ko: '이탈리아', en: 'Italy', flag: '🇮🇹' },
  '스페인': { code: 'ES', ko: '스페인', en: 'Spain', flag: '🇪🇸' },
  '프랑스': { code: 'FR', ko: '프랑스', en: 'France', flag: '🇫🇷' },
  '그리스': { code: 'GR', ko: '그리스', en: 'Greece', flag: '🇬🇷' },
  '튀르키예': { code: 'TR', ko: '튀르키예', en: 'Turkey', flag: '🇹🇷' },
  '미국 플로리다': { code: 'US', ko: '미국(플로리다)', en: 'USA', flag: '🇺🇸' },
  '미국 알래스카': { code: 'US', ko: '미국(알래스카)', en: 'USA', flag: '🇺🇸' },
  '미국 워싱턴': { code: 'US', ko: '미국(워싱턴)', en: 'USA', flag: '🇺🇸' },
  '하와이': { code: 'US', ko: '미국(하와이)', en: 'USA', flag: '🇺🇸' },
  '미국': { code: 'US', ko: '미국', en: 'USA', flag: '🇺🇸' },
  '바하마': { code: 'BS', ko: '바하마', en: 'Bahamas', flag: '🇧🇸' },
  '미국령 버진아일랜드': { code: 'VI', ko: '버진아일랜드(미국령)', en: 'US Virgin Islands', flag: '🇻🇮' },
  '신트마르턴': { code: 'SX', ko: '신트마르턴', en: 'Sint Maarten', flag: '🇸🇽' },
  '푸에르토리코': { code: 'PR', ko: '푸에르토리코', en: 'Puerto Rico', flag: '🇵🇷' },
  '캐나다 BC': { code: 'CA', ko: '캐나다(BC)', en: 'Canada', flag: '🇨🇦' },
  '노르웨이': { code: 'NO', ko: '노르웨이', en: 'Norway', flag: '🇳🇴' },
  '노르웨이 피오르': { code: 'NO', ko: '노르웨이(피오르)', en: 'Norway', flag: '🇳🇴' },
  '싱가포르': { code: 'SG', ko: '싱가포르', en: 'Singapore', flag: '🇸🇬' },
  '말레이시아': { code: 'MY', ko: '말레이시아', en: 'Malaysia', flag: '🇲🇾' },
  '태국': { code: 'TH', ko: '태국', en: 'Thailand', flag: '🇹🇭' },
  '국립공원 해상선회': { code: 'US', ko: '미국(알래스카)', en: 'USA', flag: '🇺🇸' }
};

function getCountryInfo(rawCountry: string | undefined): CountryInfo {
  if (!rawCountry) return { code: 'GL', ko: '기타/해상', en: 'Global', flag: '🌐' };
  const trimmed = rawCountry.trim();
  if (COUNTRY_INFO_MAP[trimmed]) return COUNTRY_INFO_MAP[trimmed];

  for (const [key, val] of Object.entries(COUNTRY_INFO_MAP)) {
    if (trimmed.includes(key) || key.includes(trimmed)) return val;
  }

  const matchWorld = WORLD_COUNTRIES.find(c => c.ko === trimmed || c.en.toLowerCase() === trimmed.toLowerCase() || c.code === trimmed.toUpperCase());
  if (matchWorld) return { code: matchWorld.code, ko: matchWorld.ko, en: matchWorld.en, flag: matchWorld.flag };

  return { code: 'GL', ko: trimmed, en: trimmed, flag: '🌐' };
}

const DEFAULT_ROUTE_COORDS: [number, number][] = [[41.3879, 2.1699], [43.2965, 5.3698]];

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

function generateCurvedSegment(start: [number, number], end: [number, number], curvature = 0.08, numPoints = 25): [number, number][] {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;
  const pts: [number, number][] = [];
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const perpLat = -dx * curvature;
  const perpLng = dy * curvature;
  const ctrlLat = midLat + perpLat;
  const ctrlLng = midLng + perpLng;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const inv = 1 - t;
    const lat = inv * inv * lat1 + 2 * inv * t * ctrlLat + t * t * lat2;
    const lng = inv * inv * lng1 + 2 * inv * t * ctrlLng + t * t * lng2;
    pts.push([lat, lng]);
  }
  return pts;
}

function generateMultiStopRoute(waypoints: Waypoint[], curvature = 0.08): [number, number][] {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return DEFAULT_ROUTE_COORDS;
  const allPoints: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1: [number, number] = [waypoints[i].lat, waypoints[i].lng];
    const p2: [number, number] = [waypoints[i + 1].lat, waypoints[i + 1].lng];
    const segment = generateCurvedSegment(p1, p2, curvature, 25);
    if (i > 0) segment.shift();
    allPoints.push(...segment);
  }
  return allPoints.length >= 2 ? allPoints : DEFAULT_ROUTE_COORDS;
}

function getPortStatus(index: number, totalPorts: number, progress: number): 'visited' | 'docked' | 'upcoming' {
  if (totalPorts <= 1) return 'visited';
  const totalLegs = totalPorts - 1;
  const currentT = progress * totalLegs;
  const diff = currentT - index;

  if (index === 0) {
    if (progress < 0.025) return 'docked';
    return 'visited';
  }
  if (index === totalPorts - 1) {
    if (progress >= 0.975) return 'docked';
    return 'upcoming';
  }
  if (Math.abs(diff) <= 0.07) {
    return 'docked';
  } else if (currentT > index + 0.07) {
    return 'visited';
  }
  return 'upcoming';
}

function createPortIcon(port: Waypoint, index: number, status: string, totalPorts: number): L.DivIcon {
  const isStart = index === 0;
  const isEnd = index === totalPorts - 1;
  const countryInfo = getCountryInfo(port.country);
  const flagUrl = `https://flagcdn.com/w40/${countryInfo.code.toLowerCase()}.png`;
  const flagImg = `<img src="${flagUrl}" alt="${countryInfo.code}" style="width:18px; height:12px; border-radius:2px; border:1px solid rgba(255,255,255,0.3); object-fit:cover;" onerror="this.outerHTML='${countryInfo.flag}'"/>`;

  let bgGradient = 'linear-gradient(135deg, #475569, #334155)';
  let borderColor = '#94a3b8';
  let badgeText = `${index + 1}`;
  let statusBadge = '<span style="color:#94a3b8; font-size:9px;">(예정)</span>';
  let pingRing = '';
  let roleBadge = '';

  if (isStart) {
    roleBadge = '<span style="background:#047857; color:#a7f3d0; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; border:1px solid #10b981; margin-right:2px;">🚩 출발점</span>';
  } else if (isEnd) {
    roleBadge = '<span style="background:#6b21a8; color:#f5d0fe; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; border:1px solid #c084fc; margin-right:2px;">🏁 종료점</span>';
  }

  if (status === 'visited') {
    bgGradient = isStart ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #10b981, #059669)';
    borderColor = '#a7f3d0';
    badgeText = isStart ? '🚩' : '✓';
    statusBadge = '<span style="color:#34d399; font-weight:700; font-size:9px;">✓ 방문</span>';
  } else if (status === 'docked') {
    bgGradient = isEnd ? 'linear-gradient(135deg, #7c3aed, #db2777)' : 'linear-gradient(135deg, #f59e0b, #d97706)';
    borderColor = '#fef08a';
    badgeText = isEnd ? '🏁' : '⚓';
    statusBadge = `<span style="color:#fbbf24; font-weight:800; font-size:9px;">★ ${isEnd ? '최종도착' : '기항'}</span>`;
    pingRing = `<span style="position:absolute; inset:-4px; border-radius:50%; background:#f59e0b; opacity:0.75; animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span><span style="position:absolute; inset:-8px; border-radius:50%; border:2px dashed #fbbf24; animation:spin 6s linear infinite; opacity:0.8;"></span>`;
  } else if (isEnd) {
    bgGradient = 'linear-gradient(135deg, #581c87, #3b0764)';
    borderColor = '#c084fc';
    badgeText = '🏁';
  }

  return L.divIcon({
    html: `<div style="position:relative; display:flex; flex-direction:column; align-items:center;"><div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">${pingRing}<div style="position:relative; z-index:2; width:26px; height:26px; border-radius:50%; background:${bgGradient}; border:2.5px solid ${borderColor}; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 14px rgba(0,0,0,0.65); color:#ffffff; font-weight:800; font-size:11px;">${badgeText}</div></div><div style="background:rgba(15,23,42,0.96); color:#f8fafc; font-size:10px; font-weight:600; padding:2px 7px; border-radius:6px; border:1px solid ${status === 'docked' ? '#fbbf24' : isStart ? '#10b981' : isEnd ? '#c084fc' : status === 'visited' ? '#10b981' : 'rgba(255,255,255,0.22)'}; white-space:nowrap; margin-top:4px; box-shadow:0 3px 10px rgba(0,0,0,0.65); display:flex; align-items:center; gap:4px;">${roleBadge}<span style="background:#064e3b; color:#6ee7b7; font-family:monospace; font-weight:700; font-size:9px; padding:1px 4px; border-radius:3px; border:1px solid #10b981;">[${countryInfo.code}] ${countryInfo.ko}</span>${flagImg}<span style="font-weight:700;">${port.name.split(' ')[0]}</span>${statusBadge}</div></div>`,
    className: 'cruise-port-dynamic-marker',
    iconSize: [42, 54],
    iconAnchor: [21, 14]
  });
}

function createVisitedFlagIcon(country: VisitedCountry): L.DivIcon {
  const flagUrl = `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`;
  const flagImg = `<img src="${flagUrl}" alt="${country.code}" style="width:24px; height:16px; border-radius:3px; border:1px solid rgba(255,255,255,0.4); object-fit:cover; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));" onerror="this.outerHTML='<span style=\\'font-size:16px;\\'>${country.flag}</span>'"/>`;
  return L.divIcon({
    html: `<div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer; filter:drop-shadow(0 4px 12px rgba(0,0,0,0.7)); transition:transform 0.2s ease;"><span style="position:absolute; bottom:0px; width:16px; height:16px; border-radius:50%; background:#ef4444; opacity:0.6; animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span><div style="display:flex; align-items:flex-end;"><div style="width:3px; height:34px; background:linear-gradient(to bottom, #f59e0b, #d97706, #78350f); border-radius:2px 2px 0 0; box-shadow:1px 0 2px rgba(0,0,0,0.5);"></div><div style="margin-left:-2px; margin-bottom:12px; background:linear-gradient(135deg, #1e293b, #0f172a); border:1.5px solid #f59e0b; border-radius:6px; padding:2px 6px; display:flex; align-items:center; gap:5px; box-shadow:0 3px 10px rgba(0,0,0,0.6); transform-origin:bottom left;">${flagImg}<div style="display:flex; flex-direction:column; line-height:1.1;"><span style="color:#ffffff; font-weight:800; font-size:11px; white-space:nowrap;">${country.ko}</span><span style="color:#fbbf24; font-family:monospace; font-size:8px; font-weight:700;">[${country.code}] ${country.year ? `• ${country.year}` : ''}</span></div></div></div><div style="width:10px; height:6px; background:#ef4444; border-radius:50%; border:1.5px solid #ffffff; margin-top:-2px; box-shadow:0 2px 4px rgba(0,0,0,0.8);"></div></div>`,
    className: 'visited-country-flag-icon',
    iconSize: [64, 48],
    iconAnchor: [3, 44]
  });
}

// Icon Components
function IconShip({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 6" />
      <path d="M12 10V4" />
      <path d="m12 4 5 3-5-3" />
    </svg>
  );
}

function IconAnchor({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="22" x2="12" y2="8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  );
}

function IconFlag({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function IconCompass({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconMaximize2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function EarthTravel() {
  // Hydration-safe mounting state
  const [mounted, setMounted] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<'cruise' | 'visited' | 'myTrip'>('visited');

  // Cruise States
  const [selectedPresetId, setSelectedPresetId] = useState(CRUISE_PRESETS[0].id);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(CRUISE_PRESETS[0].waypoints);
  const [transitMode, setTransitMode] = useState('boat');
  const [curvature, setCurvature] = useState(CRUISE_PRESETS[0].curvature);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [itineraryViewMode, setItineraryViewMode] = useState<'table' | 'cards'>('table');
  const [newPortName, setNewPortName] = useState('');
  const [isSearchingPort, setIsSearchingPort] = useState(false);
  const [portError, setPortError] = useState('');

  // Auth & Sync
  const [deviceId, setDeviceId] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'offline'>('connecting');

  // Visited Countries
  const [visitedCountries, setVisitedCountries] = useState<VisitedCountry[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [countryFilterContinent, setCountryFilterContinent] = useState('전체');
  const [newVisitYear, setNewVisitYear] = useState('2025');
  const [newVisitNote, setNewVisitNote] = useState('');
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);

  // Weather & Exchange Rate Cache
  const [weatherCache, setWeatherCache] = useState<Record<string, WeatherData>>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [isLoadingWeather, setIsLoadingWeather] = useState<Record<string, boolean>>({});

  // My Trip States
  const [myTripWaypoints, setMyTripWaypoints] = useState<MyTripWaypoint[]>([]);
  const [myTripProgress, setMyTripProgress] = useState(0);
  const [myTripIsPlaying, setMyTripIsPlaying] = useState(false);
  const [myTripSpeedMultiplier, setMyTripSpeedMultiplier] = useState(1);
  const [myTripIsLooping, setMyTripIsLooping] = useState(true);
  const [myTripCameraTracking, setMyTripCameraTracking] = useState(false);
  const [myTripSearchQuery, setMyTripSearchQuery] = useState('');
  const [myTripFilterContinent, setMyTripFilterContinent] = useState('전체');

  // My Trip Save/Load States
  const [showSaveTripModal, setShowSaveTripModal] = useState(false);
  const [showLoadTripModal, setShowLoadTripModal] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [saveTripTitle, setSaveTripTitle] = useState('');
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripSaveMessage, setTripSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preset Trip States
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetContinent, setPresetContinent] = useState<PresetContinent>('아시아');
  const [confirmPresetLoad, setConfirmPresetLoad] = useState<TripPreset | null>(null);

  // Nominatim Search States (도시/랜드마크 검색)
  const [nominatimQuery, setNominatimQuery] = useState('');
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [isSearchingNominatim, setIsSearchingNominatim] = useState(false);
  const [showNominatimDropdown, setShowNominatimDropdown] = useState(false);
  const nominatimDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cinema Mode States (시네마틱 전체화면 모드)
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const cinemaContainerRef = useRef<HTMLDivElement>(null);

  // Sound States (Web Audio API 효과음)
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [soundInitialized, setSoundInitialized] = useState(false);
  const currentSoundStopRef = useRef<(() => void) | null>(null);
  const lastLegIndexRef = useRef<number>(-1);

  // Map
  const [mapTheme, setMapTheme] = useState<'dark' | 'satellite' | 'light' | 'korean'>('dark');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const traveledPolylineLayerRef = useRef<L.Polyline | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const portMarkersRef = useRef<L.Marker[]>([]);
  const portStatusesRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const flagMarkersRef = useRef<L.Marker[]>([]);

  // My Trip Refs
  const myTripPolylineRef = useRef<L.Polyline | null>(null);
  const myTripTraveledPolylineRef = useRef<L.Polyline | null>(null);
  const myTripVehicleRef = useRef<L.Marker | null>(null);
  const myTripMarkersRef = useRef<L.Marker[]>([]);
  const myTripAnimationRef = useRef<number | null>(null);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // Device ID initialization & localStorage load
  useEffect(() => {
    if (!mounted) return;
    const id = getDeviceId();
    setDeviceId(id);

    // 먼저 localStorage에서 로드
    const localData = loadFromLocalStorage();
    if (localData.length > 0) {
      setVisitedCountries(localData);
      setIsDataLoaded(true);
    }

    if (!supabase) {
      setSyncStatus('offline');
      setIsDataLoaded(true);
    }
  }, [mounted]);

  // Cloud Sync with Supabase (localStorage 우선, Supabase는 백업용)
  useEffect(() => {
    if (!deviceId || !supabase) return;

    const syncWithSupabase = async () => {
      const localData = loadFromLocalStorage();

      try {
        const { data, error } = await supabase
          .from('visited_countries')
          .select('*')
          .eq('device_id', deviceId);

        if (error) {
          console.error('Supabase query error:', error.message);
          // 에러 시 localStorage 데이터 유지
          if (localData.length > 0) {
            setVisitedCountries(localData);
          }
          setSyncStatus('offline');
          setIsDataLoaded(true);
          return;
        }

        // Supabase 데이터만 사용 (localStorage 자동 업로드 제거)
        if (data && data.length > 0) {
          const countries: VisitedCountry[] = data.map((row) => ({
            code: row.code,
            ko: row.ko,
            en: row.en,
            flag: row.flag,
            continent: row.continent,
            lat: row.lat,
            lng: row.lng,
            year: row.year || undefined,
            note: row.note || undefined,
          }));
          setVisitedCountries(countries);
          saveToLocalStorage(countries);
        }
        // Supabase가 비어있으면 빈 상태 유지 (자동 업로드 하지 않음)
        setSyncStatus('synced');
        setIsDataLoaded(true);
      } catch (err) {
        console.error('Supabase sync error:', err);
        // 에러 시 localStorage 데이터 유지
        if (localData.length > 0) {
          setVisitedCountries(localData);
        }
        setSyncStatus('offline');
        setIsDataLoaded(true);
      }
    };

    syncWithSupabase();

    // Realtime subscription
    const channel = supabase
      .channel('visited_countries_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'visited_countries', filter: `device_id=eq.${deviceId}` },
        () => { syncWithSupabase(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [deviceId]);

  // visitedCountries 변경 시 localStorage에 저장
  useEffect(() => {
    if (isDataLoaded && visitedCountries.length > 0) {
      saveToLocalStorage(visitedCountries);
    }
  }, [visitedCountries, isDataLoaded]);

  // Filtered presets
  const filteredPresets = useMemo(() => {
    if (selectedRegion === '전체') return CRUISE_PRESETS;
    return CRUISE_PRESETS.filter(p => p.region === selectedRegion);
  }, [selectedRegion]);

  // Route calculations
  const routePoints = useMemo(() => generateMultiStopRoute(waypoints, curvature), [waypoints, curvature]);

  const currentMotion = useMemo(() => {
    const pts = routePoints.length >= 2 ? routePoints : DEFAULT_ROUTE_COORDS;
    const maxIdx = pts.length - 1;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const floatIdx = clampedProgress * maxIdx;
    const lowerIdx = Math.floor(floatIdx);
    const upperIdx = Math.ceil(floatIdx);
    const remainder = floatIdx - lowerIdx;
    const p1 = pts[Math.min(lowerIdx, maxIdx)];
    const p2 = pts[Math.min(upperIdx, maxIdx)];
    const lat = p1[0] + (p2[0] - p1[0]) * remainder;
    const lng = p1[1] + (p2[1] - p1[1]) * remainder;
    const lookP = pts[Math.min(lowerIdx + 1, maxIdx)];
    const heading = calculateBearing(p1[0], p1[1], lookP[0], lookP[1]);
    return { lat, lng, heading };
  }, [routePoints, progress]);

  const activeLegInfo = useMemo(() => {
    if (waypoints.length < 2) return { legNum: 0, totalLegs: 0, fromName: '', toName: '', fromCountry: '', toCountry: '', legPercent: 0, dockedPort: null as Waypoint | null };
    const numLegs = waypoints.length - 1;
    const legFloat = Math.min(progress, 0.9999) * numLegs;
    const currentLegIdx = Math.floor(legFloat);
    const legPercent = Math.round((legFloat - currentLegIdx) * 100);
    const fromPort = waypoints[currentLegIdx];
    const toPort = waypoints[currentLegIdx + 1] || waypoints[waypoints.length - 1];
    let dockedPort: Waypoint | null = null;
    waypoints.forEach((p, idx) => {
      if (getPortStatus(idx, waypoints.length, progress) === 'docked') dockedPort = p;
    });
    return { legNum: currentLegIdx + 1, totalLegs: numLegs, fromName: fromPort?.name || '', toName: toPort?.name || '', fromCountry: fromPort?.country || '', toCountry: toPort?.country || '', legPercent, dockedPort };
  }, [waypoints, progress]);

  const visitedStats = useMemo(() => {
    const count = visitedCountries.length;
    const worldPercent = ((count / 204) * 100).toFixed(1);
    const continentCounts: Record<string, number> = { 아시아: 0, 유럽: 0, 아메리카: 0, 오세아니아: 0, 아프리카: 0 };
    visitedCountries.forEach((c) => {
      if (continentCounts[c.continent] !== undefined) continentCounts[c.continent]++;
    });
    return { count, worldPercent, continentCounts };
  }, [visitedCountries]);

  // My Trip Route Calculation
  const getCurvatureForTransport = (mode?: TransportMode): number => {
    switch (mode) {
      case 'plane': return 0.15;
      case 'boat': return 0.08;
      case 'train': case 'bus': case 'car': return 0.02;
      default: return 0.15;
    }
  };

  const myTripRouteData = useMemo(() => {
    if (myTripWaypoints.length < 2) return { routePoints: [] as [number, number][], legStartIndices: [] as number[] };

    const allPoints: [number, number][] = [];
    const legStartIndices: number[] = [0];

    for (let i = 0; i < myTripWaypoints.length - 1; i++) {
      const w1 = myTripWaypoints[i];
      const w2 = myTripWaypoints[i + 1];
      const curvature = getCurvatureForTransport(w1.transportToNext);
      const segment = generateCurvedSegment([w1.lat, w1.lng], [w2.lat, w2.lng], curvature, 25);
      if (i > 0) segment.shift();
      allPoints.push(...segment);
      if (i < myTripWaypoints.length - 2) {
        legStartIndices.push(allPoints.length - 1);
      }
    }

    return { routePoints: allPoints, legStartIndices };
  }, [myTripWaypoints]);

  const myTripCurrentMotion = useMemo(() => {
    const pts = myTripRouteData.routePoints;
    if (pts.length < 2) return { lat: 0, lng: 0, heading: 0, currentLegIndex: 0 };

    const maxIdx = pts.length - 1;
    const clampedProgress = Math.max(0, Math.min(1, myTripProgress));
    const floatIdx = clampedProgress * maxIdx;
    const lowerIdx = Math.floor(floatIdx);
    const upperIdx = Math.ceil(floatIdx);
    const remainder = floatIdx - lowerIdx;
    const p1 = pts[Math.min(lowerIdx, maxIdx)];
    const p2 = pts[Math.min(upperIdx, maxIdx)];
    const lat = p1[0] + (p2[0] - p1[0]) * remainder;
    const lng = p1[1] + (p2[1] - p1[1]) * remainder;
    const lookP = pts[Math.min(lowerIdx + 1, maxIdx)];
    const heading = calculateBearing(p1[0], p1[1], lookP[0], lookP[1]);

    // Determine current leg index
    let currentLegIndex = 0;
    if (myTripWaypoints.length >= 2) {
      const numLegs = myTripWaypoints.length - 1;
      const legFloat = clampedProgress * numLegs;
      currentLegIndex = Math.min(Math.floor(legFloat), numLegs - 1);
    }

    return { lat, lng, heading, currentLegIndex };
  }, [myTripRouteData.routePoints, myTripProgress, myTripWaypoints.length]);

  // 구간별 거리/시간 계산
  const myTripLegInfos = useMemo((): MyTripLegInfo[] => {
    if (myTripWaypoints.length < 2) return [];
    const infos: MyTripLegInfo[] = [];
    for (let i = 0; i < myTripWaypoints.length - 1; i++) {
      const w1 = myTripWaypoints[i];
      const w2 = myTripWaypoints[i + 1];
      const distanceKm = calculateHaversineDistance(w1.lat, w1.lng, w2.lat, w2.lng);
      const mode = w1.transportToNext || 'plane';
      const travelTimeHours = calculateTravelTime(distanceKm, mode);
      infos.push({
        distanceKm,
        travelTimeHours,
        formattedDistance: distanceKm >= 1000
          ? `${(distanceKm / 1000).toFixed(1)}천km`
          : `${Math.round(distanceKm).toLocaleString()}km`,
        formattedTime: formatTravelTime(travelTimeHours),
      });
    }
    return infos;
  }, [myTripWaypoints]);

  // 총 거리/시간 요약
  const myTripTotalStats = useMemo(() => {
    if (myTripLegInfos.length === 0) return { totalKm: 0, totalHours: 0, formattedDistance: '', formattedTime: '' };
    const totalKm = myTripLegInfos.reduce((sum, leg) => sum + leg.distanceKm, 0);
    const totalHours = myTripLegInfos.reduce((sum, leg) => sum + leg.travelTimeHours, 0);
    return {
      totalKm,
      totalHours,
      formattedDistance: totalKm >= 1000
        ? `${(totalKm / 1000).toFixed(1)}천km`
        : `${Math.round(totalKm).toLocaleString()}km`,
      formattedTime: formatTravelTime(totalHours),
    };
  }, [myTripLegInfos]);

  const myTripFilteredCountries = useMemo(() => {
    const q = myTripSearchQuery.trim().toLowerCase();
    return WORLD_COUNTRIES.filter((c) => {
      const matchQuery = !q || c.ko.toLowerCase().includes(q) || c.en.toLowerCase().includes(q) || c.code.toLowerCase() === q;
      const matchContinent = myTripFilterContinent === '전체' || c.continent === myTripFilterContinent;
      // 중복 국가 허용 - 왕복/경유를 위해 같은 나라 여러 번 추가 가능
      return matchQuery && matchContinent;
    });
  }, [myTripSearchQuery, myTripFilterContinent]);

  // Fetch weather data with caching
  const fetchWeather = useCallback(async (lat: number, lng: number, cacheKey: string) => {
    if (weatherCache[cacheKey] || isLoadingWeather[cacheKey]) return;

    setIsLoadingWeather(prev => ({ ...prev, [cacheKey]: true }));
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
      );
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();
      const weather = data.current_weather;
      setWeatherCache(prev => ({
        ...prev,
        [cacheKey]: {
          temperature: Math.round(weather.temperature),
          windspeed: Math.round(weather.windspeed),
          weathercode: weather.weathercode,
          emoji: getWeatherEmoji(weather.weathercode),
        },
      }));
    } catch (err) {
      console.error('Weather fetch error:', err);
    } finally {
      setIsLoadingWeather(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [weatherCache, isLoadingWeather]);

  // Static rates for currencies not supported by Frankfurter API (approximate, 2024)
  const STATIC_RATES: ExchangeRates = {
    KRW: 1,
    // ECB supported currencies (will be updated from API)
    USD: 1350, EUR: 1500, JPY: 9, GBP: 1750, CHF: 1550,
    AUD: 900, CAD: 1000, CNY: 190, HKD: 175, SGD: 1020,
    THB: 40, SEK: 130, NOK: 130, DKK: 200, PLN: 340,
    CZK: 60, HUF: 4, TRY: 42, NZD: 830, MXN: 80,
    BRL: 280, INR: 16, IDR: 0.09, MYR: 300, PHP: 24,
    ZAR: 75, ISK: 10,
    // Not supported by Frankfurter API (static only)
    TWD: 43, VND: 0.055, AED: 370, EGP: 28,
    ARS: 2, CLP: 1.5, PEN: 365, MNT: 0.4, MAD: 135
  };

  // Fetch exchange rates (cached globally)
  const fetchExchangeRates = useCallback(async () => {
    if (Object.keys(exchangeRates).length > 0) return;
    try {
      // Frankfurter API: EUR 기준 (ECB 지원 통화만)
      const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=KRW,USD,JPY,GBP,CHF,AUD,CAD,CNY,HKD,SGD,THB,SEK,NOK,DKK,PLN,CZK,HUF,TRY,NZD,MXN,BRL,INR,IDR,MYR,PHP,ZAR,ISK');
      if (!res.ok) throw new Error('Exchange API error');
      const data = await res.json();

      // KRW 기준으로 변환: 1 외화 = X KRW
      const krwPerEur = data.rates.KRW || 1500;
      const rates: ExchangeRates = { ...STATIC_RATES, EUR: Math.round(krwPerEur) };

      for (const [currency, eurRate] of Object.entries(data.rates)) {
        if (currency === 'KRW') continue;
        rates[currency] = Math.round(krwPerEur / (eurRate as number));
      }

      setExchangeRates(rates);
    } catch {
      // Network error - silently use static fallback rates
      setExchangeRates(STATIC_RATES);
    }
  }, [exchangeRates]);

  // Load exchange rates on mount
  useEffect(() => {
    if (mounted) {
      fetchExchangeRates();
    }
  }, [mounted, fetchExchangeRates]);

  // Get exchange rate display for a country
  const getExchangeDisplay = useCallback((countryCode: string): string => {
    const currency = COUNTRY_CURRENCY[countryCode];
    if (!currency || currency === 'KRW') return '';
    const rate = exchangeRates[currency];
    if (!rate) return '';
    if (currency === 'JPY' || currency === 'VND' || currency === 'IDR' || currency === 'HUF') {
      return `100${currency}≈${Math.round(rate * 100).toLocaleString()}원`;
    }
    return `1${currency}≈${rate.toLocaleString()}원`;
  }, [exchangeRates]);

  const filteredSearchCountries = useMemo(() => {
    const q = countrySearchQuery.trim().toLowerCase();
    return WORLD_COUNTRIES.filter((c) => {
      const matchQuery = !q || c.ko.toLowerCase().includes(q) || c.en.toLowerCase().includes(q) || c.code.toLowerCase() === q;
      const matchContinent = countryFilterContinent === '전체' || c.continent === countryFilterContinent;
      return matchQuery && matchContinent;
    });
  }, [countrySearchQuery, countryFilterContinent]);

  // Tile layer update
  const updateTileLayer = useCallback(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    let options: L.TileLayerOptions = { maxZoom: 16 };

    if (mapTheme === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      options = { maxZoom: 19 };
    } else if (mapTheme === 'light') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      options = { maxZoom: 18 };
    } else if (mapTheme === 'korean') {
      // Google 한국어 지도 (전 세계 한글 라벨)
      tileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}';
      options = { maxZoom: 19 };
    }

    tileLayerRef.current = L.tileLayer(tileUrl, options).addTo(map);
  }, [mapTheme]);

  // Fit bounds
  const fitBoundsForCurrentTab = useCallback(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    if (activeTab === 'cruise' && waypoints.length > 0) {
      const latLngs = waypoints.map((p) => [p.lat, p.lng] as [number, number]);
      map.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60], maxZoom: 9 });
    } else if (activeTab === 'visited' && visitedCountries.length > 0) {
      const latLngs = visitedCountries.map((c) => [c.lat, c.lng] as [number, number]);
      map.fitBounds(L.latLngBounds(latLngs), { padding: [80, 80], maxZoom: 6 });
    } else if (activeTab === 'myTrip' && myTripWaypoints.length > 0) {
      const latLngs = myTripWaypoints.map((w) => [w.lat, w.lng] as [number, number]);
      map.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60], maxZoom: 6 });
    }
  }, [activeTab, waypoints, visitedCountries, myTripWaypoints]);

  // Initialize map
  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;
    if (leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30, 20],
      zoom: 3,
      zoomControl: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    leafletMapRef.current = map;
    updateTileLayer();

    setTimeout(() => fitBoundsForCurrentTab(), 100);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    if (leafletMapRef.current) updateTileLayer();
  }, [mapTheme, updateTileLayer]);

  useEffect(() => {
    if (leafletMapRef.current) {
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
        fitBoundsForCurrentTab();
      }, 100);
    }
  }, [activeTab, fitBoundsForCurrentTab]);

  // Cruise layers
  useEffect(() => {
    if (!leafletMapRef.current || !mounted) return;
    const map = leafletMapRef.current;

    // Cleanup
    if (polylineLayerRef.current) map.removeLayer(polylineLayerRef.current);
    if (traveledPolylineLayerRef.current) map.removeLayer(traveledPolylineLayerRef.current);
    if (vehicleMarkerRef.current) map.removeLayer(vehicleMarkerRef.current);
    portMarkersRef.current.forEach((m) => map.removeLayer(m));
    portMarkersRef.current = [];
    vehicleMarkerRef.current = null;

    if (activeTab !== 'cruise') return;

    const safePoints = routePoints.length >= 2 ? routePoints : DEFAULT_ROUTE_COORDS;
    polylineLayerRef.current = L.polyline(safePoints, { color: '#64748b', weight: 3, opacity: 0.45, dashArray: '6, 8' }).addTo(map);
    traveledPolylineLayerRef.current = L.polyline([], { color: '#00f2fe', weight: 5, opacity: 0.95 }).addTo(map);

    portStatusesRef.current = [];
    waypoints.forEach((p, index) => {
      const initialStatus = getPortStatus(index, waypoints.length, progress);
      portStatusesRef.current.push(initialStatus);
      const portIcon = createPortIcon(p, index, initialStatus, waypoints.length);
      const marker = L.marker([p.lat, p.lng], { icon: portIcon }).addTo(map);
      portMarkersRef.current.push(marker);
    });
  }, [activeTab, routePoints, waypoints, mounted]);

  // Flag markers
  useEffect(() => {
    if (!leafletMapRef.current || !mounted) return;
    const map = leafletMapRef.current;
    flagMarkersRef.current.forEach((m) => map.removeLayer(m));
    flagMarkersRef.current = [];

    if (activeTab !== 'visited') return;

    visitedCountries.forEach((c) => {
      const flagIcon = createVisitedFlagIcon(c);
      const marker = L.marker([c.lat, c.lng], { icon: flagIcon, zIndexOffset: 800 }).addTo(map);
      marker.on('click', () => map.setView([c.lat, c.lng], Math.max(5, map.getZoom()), { animate: true }));
      flagMarkersRef.current.push(marker);
    });
  }, [activeTab, visitedCountries, mounted]);

  // Vehicle animation
  useEffect(() => {
    if (activeTab !== 'cruise' || !leafletMapRef.current || !mounted) return;
    const map = leafletMapRef.current;

    const renderVehicleSvgHtml = (type: string) => {
      if (type === 'plane') return `<svg style="width:30px; height:30px; color:#fbbf24;" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
      if (type === 'car') return `<svg style="width:28px; height:28px; color:#34d399;" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
      if (type === 'arrow') return `<div style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, #06b6d4, #2563eb); border:2px solid #ffffff;"><svg style="width:16px; height:16px; color:#ffffff; transform:rotate(-45deg);" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>`;
      return `<div style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; background:rgba(6,182,212,0.25); border:2px solid #22d3ee;"><svg style="width:24px; height:24px; color:#ffffff;" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 6"/><path d="M12 10V4"/><path d="m12 4 5 3-5-3"/></svg></div>`;
    };

    const vehicleIcon = L.divIcon({
      html: `<div style="transform: rotate(${Math.round(currentMotion.heading)}deg); transition: transform 0.1s linear;">${renderVehicleSvgHtml(transitMode)}</div>`,
      className: 'vehicle-cruise-animated-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([currentMotion.lat, currentMotion.lng], { icon: vehicleIcon, zIndexOffset: 1200 }).addTo(map);
    } else {
      vehicleMarkerRef.current.setLatLng([currentMotion.lat, currentMotion.lng]);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    }

    if (traveledPolylineLayerRef.current && routePoints.length > 1) {
      const activeIdx = Math.floor(progress * (routePoints.length - 1));
      const traveled = routePoints.slice(0, activeIdx + 1);
      traveled.push([currentMotion.lat, currentMotion.lng]);
      traveledPolylineLayerRef.current.setLatLngs(traveled);
    }

    waypoints.forEach((port, idx) => {
      const marker = portMarkersRef.current[idx];
      if (!marker) return;
      const currentStatus = getPortStatus(idx, waypoints.length, progress);
      if (portStatusesRef.current[idx] !== currentStatus) {
        portStatusesRef.current[idx] = currentStatus;
        marker.setIcon(createPortIcon(port, idx, currentStatus, waypoints.length));
      }
    });
  }, [activeTab, currentMotion, transitMode, routePoints, progress, waypoints, mounted]);

  // Animation loop
  useEffect(() => {
    if (activeTab !== 'cruise' || !isPlaying || !mounted) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const loop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const baseDuration = (Math.max(2, waypoints.length) * 4.2) / speedMultiplier;
      const step = delta / baseDuration;

      setProgress((prev) => {
        const next = prev + step;
        if (next >= 1) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeTab, isPlaying, speedMultiplier, isLooping, waypoints.length, mounted]);

  // My Trip Map Layers
  useEffect(() => {
    if (!leafletMapRef.current || !mounted) return;
    const map = leafletMapRef.current;

    // Cleanup
    if (myTripPolylineRef.current) map.removeLayer(myTripPolylineRef.current);
    if (myTripTraveledPolylineRef.current) map.removeLayer(myTripTraveledPolylineRef.current);
    if (myTripVehicleRef.current) map.removeLayer(myTripVehicleRef.current);
    myTripMarkersRef.current.forEach((m) => map.removeLayer(m));
    myTripMarkersRef.current = [];
    myTripPolylineRef.current = null;
    myTripTraveledPolylineRef.current = null;
    myTripVehicleRef.current = null;

    if (activeTab !== 'myTrip' || myTripWaypoints.length < 2) return;

    const pts = myTripRouteData.routePoints;
    if (pts.length < 2) return;

    // Draw full route (gray dashed)
    myTripPolylineRef.current = L.polyline(pts, {
      color: '#64748b',
      weight: 3,
      opacity: 0.45,
      dashArray: '6, 8'
    }).addTo(map);

    // Draw traveled route (cyan glow)
    myTripTraveledPolylineRef.current = L.polyline([], {
      color: '#00f2fe',
      weight: 5,
      opacity: 0.95
    }).addTo(map);

    // Add waypoint markers
    myTripWaypoints.forEach((w, index) => {
      const isStart = index === 0;
      const isEnd = index === myTripWaypoints.length - 1;
      const flagUrl = `https://flagcdn.com/w40/${w.countryCode.toLowerCase()}.png`;

      const markerHtml = `
        <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
          <div style="width:28px; height:28px; border-radius:50%; background:${isStart ? 'linear-gradient(135deg, #059669, #047857)' : isEnd ? 'linear-gradient(135deg, #7c3aed, #db2777)' : 'linear-gradient(135deg, #475569, #334155)'}; border:2.5px solid ${isStart ? '#a7f3d0' : isEnd ? '#c084fc' : '#94a3b8'}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:11px; box-shadow:0 3px 14px rgba(0,0,0,0.65);">
            ${isStart ? '🚩' : isEnd ? '🏁' : index + 1}
          </div>
          <div style="background:rgba(15,23,42,0.96); color:#f8fafc; font-size:10px; font-weight:600; padding:2px 7px; border-radius:6px; border:1px solid ${isStart ? '#10b981' : isEnd ? '#c084fc' : 'rgba(255,255,255,0.22)'}; white-space:nowrap; margin-top:4px; box-shadow:0 3px 10px rgba(0,0,0,0.65); display:flex; align-items:center; gap:4px;">
            <img src="${flagUrl}" alt="${w.countryCode}" style="width:16px; height:11px; border-radius:2px; object-fit:cover;" onerror="this.style.display='none'"/>
            <span>${w.name}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'my-trip-waypoint-marker',
        iconSize: [42, 54],
        iconAnchor: [21, 14]
      });

      const marker = L.marker([w.lat, w.lng], { icon }).addTo(map);
      myTripMarkersRef.current.push(marker);
    });

    // Fit bounds
    const latLngs = myTripWaypoints.map((w) => [w.lat, w.lng] as [number, number]);
    map.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60], maxZoom: 6 });

  }, [activeTab, myTripWaypoints, myTripRouteData.routePoints, mounted]);

  // My Trip Vehicle Animation
  useEffect(() => {
    if (activeTab !== 'myTrip' || !leafletMapRef.current || !mounted || myTripWaypoints.length < 2) return;
    const map = leafletMapRef.current;
    const pts = myTripRouteData.routePoints;
    if (pts.length < 2) return;

    const currentTransport = myTripWaypoints[myTripCurrentMotion.currentLegIndex]?.transportToNext || 'plane';

    const renderMyTripVehicle = (mode: TransportMode) => {
      const colors: Record<TransportMode, string> = {
        plane: '#fbbf24',
        boat: '#22d3ee',
        train: '#a78bfa',
        bus: '#fb923c',
        car: '#34d399'
      };
      const color = colors[mode];

      if (mode === 'plane') {
        return `<svg style="width:30px; height:30px; color:${color};" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
      }
      if (mode === 'boat') {
        return `<div style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; background:rgba(6,182,212,0.25); border:2px solid ${color};"><svg style="width:24px; height:24px; color:#fff;" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 6"/><path d="M12 10V4"/><path d="m12 4 5 3-5-3"/></svg></div>`;
      }
      if (mode === 'train') {
        return `<div style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:${color}; border:2px solid #fff;"><svg style="width:18px; height:18px; color:#fff;" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/><path d="M8 19l-2 3"/><path d="M16 19l2 3"/></svg></div>`;
      }
      if (mode === 'bus') {
        return `<div style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:${color}; border:2px solid #fff;"><svg style="width:18px; height:18px; color:#fff;" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M7 18h2"/><path d="M15 18h2"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg></div>`;
      }
      // car
      return `<svg style="width:28px; height:28px; color:${color};" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
    };

    const vehicleIcon = L.divIcon({
      html: `<div style="transform: rotate(${Math.round(myTripCurrentMotion.heading)}deg); transition: transform 0.1s linear;">${renderMyTripVehicle(currentTransport)}</div>`,
      className: 'my-trip-vehicle-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (!myTripVehicleRef.current) {
      myTripVehicleRef.current = L.marker([myTripCurrentMotion.lat, myTripCurrentMotion.lng], {
        icon: vehicleIcon,
        zIndexOffset: 1200
      }).addTo(map);
    } else {
      myTripVehicleRef.current.setLatLng([myTripCurrentMotion.lat, myTripCurrentMotion.lng]);
      myTripVehicleRef.current.setIcon(vehicleIcon);
    }

    // Update traveled polyline
    if (myTripTraveledPolylineRef.current && pts.length > 1) {
      const activeIdx = Math.floor(myTripProgress * (pts.length - 1));
      const traveled = pts.slice(0, activeIdx + 1);
      traveled.push([myTripCurrentMotion.lat, myTripCurrentMotion.lng]);
      myTripTraveledPolylineRef.current.setLatLngs(traveled);
    }

    // Camera tracking - enhanced for cinema mode
    if (myTripCameraTracking && myTripIsPlaying) {
      if (isCinemaMode) {
        // Cinema mode: smoother tracking with dynamic zoom
        const totalLegs = myTripWaypoints.length - 1;
        const progressPerLeg = 1 / totalLegs;
        const currentLegIdx = Math.min(Math.floor(myTripProgress / progressPerLeg), totalLegs - 1);
        const legStartProgress = currentLegIdx * progressPerLeg;
        const legProgress = (myTripProgress - legStartProgress) / progressPerLeg;

        // Dynamic zoom: zoom in when approaching destination
        let targetZoom = 5;
        if (legProgress > 0.85) {
          // Arrival zoom: gradually zoom in from 5 to 7
          targetZoom = 5 + (legProgress - 0.85) / 0.15 * 2;
        } else if (legProgress < 0.15) {
          // Departure: gradually zoom out from 6 to 5
          targetZoom = 6 - legProgress / 0.15;
        }

        const currentZoom = map.getZoom();
        const smoothZoom = currentZoom + (targetZoom - currentZoom) * 0.05;

        map.setView([myTripCurrentMotion.lat, myTripCurrentMotion.lng], smoothZoom, {
          animate: true,
          duration: 0.5,
          easeLinearity: 0.5,
        });
      } else {
        // Normal mode: simple pan
        map.panTo([myTripCurrentMotion.lat, myTripCurrentMotion.lng], { animate: true, duration: 0.3 });
      }
    }

  }, [activeTab, myTripCurrentMotion, myTripWaypoints, myTripRouteData.routePoints, myTripProgress, myTripCameraTracking, myTripIsPlaying, mounted, isCinemaMode]);

  // My Trip Animation Loop
  useEffect(() => {
    if (activeTab !== 'myTrip' || !myTripIsPlaying || !mounted || myTripWaypoints.length < 2) {
      if (myTripAnimationRef.current) cancelAnimationFrame(myTripAnimationRef.current);
      return;
    }

    let lastTime = performance.now();
    const loop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const baseDuration = (Math.max(2, myTripWaypoints.length) * 4.2) / myTripSpeedMultiplier;
      const step = delta / baseDuration;

      setMyTripProgress((prev) => {
        const next = prev + step;
        if (next >= 1) {
          if (myTripIsLooping) return 0;
          setMyTripIsPlaying(false);
          return 1;
        }
        return next;
      });
      myTripAnimationRef.current = requestAnimationFrame(loop);
    };

    myTripAnimationRef.current = requestAnimationFrame(loop);
    return () => {
      if (myTripAnimationRef.current) cancelAnimationFrame(myTripAnimationRef.current);
    };
  }, [activeTab, myTripIsPlaying, myTripSpeedMultiplier, myTripIsLooping, myTripWaypoints.length, mounted]);

  // Handlers
  const handleSelectPreset = (preset: CruisePreset) => {
    setSelectedPresetId(preset.id);
    setWaypoints([...preset.waypoints]);
    setCurvature(preset.curvature);
    setTransitMode(preset.recommendedMode);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleToggleVisitedCountry = async (country: VisitedCountry) => {
    const isAlready = visitedCountries.some((c) => c.code === country.code);
    const newEntry = { ...country, year: newVisitYear.trim() || '2025', note: newVisitNote.trim() || '' };

    if (!isAlready && leafletMapRef.current) {
      leafletMapRef.current.setView([country.lat, country.lng], 5, { animate: true });
    }

    if (deviceId && supabase) {
      try {
        if (isAlready) {
          await supabase
            .from('visited_countries')
            .delete()
            .eq('device_id', deviceId)
            .eq('code', country.code);
          setVisitedCountries((prev) => prev.filter((c) => c.code !== country.code));
        } else {
          await supabase
            .from('visited_countries')
            .upsert({
              device_id: deviceId,
              code: newEntry.code,
              ko: newEntry.ko,
              en: newEntry.en,
              flag: newEntry.flag,
              continent: newEntry.continent,
              lat: newEntry.lat,
              lng: newEntry.lng,
              year: newEntry.year,
              note: newEntry.note,
            }, { onConflict: 'device_id,code' });
          setVisitedCountries((prev) => [...prev, newEntry]);
        }
      } catch (err) {
        console.error('Supabase save failed', err);
      }
    } else {
      if (isAlready) setVisitedCountries((prev) => prev.filter((c) => c.code !== country.code));
      else setVisitedCountries((prev) => [...prev, newEntry]);
    }
  };

  const handleRemoveVisitedCountry = async (code: string) => {
    if (deviceId && supabase) {
      try {
        await supabase
          .from('visited_countries')
          .delete()
          .eq('device_id', deviceId)
          .eq('code', code);
        setVisitedCountries((prev) => prev.filter((c) => c.code !== code));
      } catch (err) {
        console.error('Supabase delete failed', err);
      }
    } else {
      setVisitedCountries((prev) => prev.filter((c) => c.code !== code));
    }
  };

  const handleAddPort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortName.trim()) return;
    setIsSearchingPort(true);
    setPortError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newPortName)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          const shortName = (data[0].display_name || newPortName).split(',')[0];
          setWaypoints((prev) => [...prev, { id: `port-${Date.now()}`, name: shortName, country: '신규 기항지', lat, lng, day: `Day ${prev.length + 1}` }]);
          setNewPortName('');
          setProgress(0);
          return;
        }
      }
      throw new Error(`도시 또는 항구를 찾을 수 없습니다: "${newPortName}"`);
    } catch (err: unknown) {
      setPortError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearchingPort(false);
    }
  };

  const handleRemovePort = (idx: number) => {
    if (waypoints.length <= 2) { setPortError('최소 2개 이상의 기항지가 필요합니다.'); return; }
    setWaypoints((prev) => prev.filter((_, i) => i !== idx));
    setProgress(0);
  };

  const handleMovePort = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= waypoints.length) return;
    setWaypoints((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
    setProgress(0);
  };

  // My Trip Handlers
  const handleAddToMyTrip = (country: VisitedCountry) => {
    // 고유 id 생성 - 동일 국가도 여러 번 추가 가능 (왕복/경유 지원)
    const uniqueId = `${country.code}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newWaypoint: MyTripWaypoint = {
      id: uniqueId,
      name: country.ko,
      countryCode: country.code,
      lat: country.lat,
      lng: country.lng,
      order: myTripWaypoints.length,
      transportToNext: 'plane',
    };
    setMyTripWaypoints(prev => [...prev, newWaypoint]);
    setMyTripProgress(0);
    setMyTripIsPlaying(false);

    // Pan to country
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([country.lat, country.lng], 5, { animate: true });
    }
  };

  const handleRemoveFromMyTrip = (waypointId: string) => {
    setMyTripWaypoints(prev => {
      const filtered = prev.filter(w => w.id !== waypointId);
      return filtered.map((w, i) => ({ ...w, order: i }));
    });
    setMyTripProgress(0);
  };

  const handleMoveMyTripWaypoint = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= myTripWaypoints.length) return;
    setMyTripWaypoints(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated.map((w, i) => ({ ...w, order: i }));
    });
    setMyTripProgress(0);
  };

  const handleSetLegTransport = (waypointIdx: number, mode: TransportMode) => {
    setMyTripWaypoints(prev =>
      prev.map((w, i) => i === waypointIdx ? { ...w, transportToNext: mode } : w)
    );
    setMyTripProgress(0);
  };

  const handleMyTripReset = () => {
    setMyTripProgress(0);
    setMyTripIsPlaying(false);
  };

  const handleClearMyTrip = () => {
    setMyTripWaypoints([]);
    setMyTripProgress(0);
    setMyTripIsPlaying(false);
  };

  // Nominatim Search Handler (도시/랜드마크 검색)
  const searchNominatim = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setNominatimResults([]);
      setShowNominatimDropdown(false);
      return;
    }

    setIsSearchingNominatim(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&accept-language=ko&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EarthTravel/1.0 (https://earth-travel.vercel.app)',
        },
      });
      if (!res.ok) throw new Error('Search failed');
      const data: NominatimResult[] = await res.json();
      setNominatimResults(data);
      setShowNominatimDropdown(data.length > 0);
    } catch {
      setNominatimResults([]);
      setShowNominatimDropdown(false);
    } finally {
      setIsSearchingNominatim(false);
    }
  }, []);

  const handleNominatimQueryChange = (value: string) => {
    setNominatimQuery(value);

    // Debounce 300ms
    if (nominatimDebounceRef.current) {
      clearTimeout(nominatimDebounceRef.current);
    }
    nominatimDebounceRef.current = setTimeout(() => {
      searchNominatim(value);
    }, 300);
  };

  const handleSelectNominatimResult = (result: NominatimResult) => {
    const countryCode = result.address?.country_code?.toUpperCase() || 'XX';
    const cityName = result.name || result.display_name.split(',')[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Find country info from WORLD_COUNTRIES for proper flag/name
    const countryInfo = WORLD_COUNTRIES.find(c => c.code === countryCode);
    const displayName = countryInfo
      ? `${cityName} (${countryInfo.ko})`
      : `${cityName} (${result.address?.country || '알 수 없음'})`;

    const uniqueId = `${countryCode}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newWaypoint: MyTripWaypoint = {
      id: uniqueId,
      name: displayName,
      countryCode: countryCode,
      lat: lat,
      lng: lng,
      order: myTripWaypoints.length,
      transportToNext: 'plane',
    };

    setMyTripWaypoints(prev => [...prev, newWaypoint]);
    setMyTripProgress(0);
    setMyTripIsPlaying(false);
    setNominatimQuery('');
    setNominatimResults([]);
    setShowNominatimDropdown(false);

    // Pan to location
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 8, { animate: true });
    }
  };

  // Cinema Mode Handlers (시네마틱 전체화면 모드)
  const enterCinemaMode = useCallback(() => {
    if (myTripWaypoints.length < 2) return;
    setIsCinemaMode(true);
    setMyTripCameraTracking(true);

    // Enter fullscreen
    if (cinemaContainerRef.current?.requestFullscreen) {
      cinemaContainerRef.current.requestFullscreen().catch(() => {
        // Fullscreen failed, continue in windowed cinema mode
      });
    }

    // Start playing if not already
    if (!myTripIsPlaying) {
      setMyTripIsPlaying(true);
    }
  }, [myTripWaypoints.length, myTripIsPlaying]);

  const exitCinemaMode = useCallback(() => {
    setIsCinemaMode(false);

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const toggleCinemaMode = useCallback(() => {
    if (isCinemaMode) {
      exitCinemaMode();
    } else {
      enterCinemaMode();
    }
  }, [isCinemaMode, enterCinemaMode, exitCinemaMode]);

  // Cinema mode keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if myTrip tab is active
      if (activeTab !== 'myTrip') return;

      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleCinemaMode();
      } else if (e.key === 'Escape' && isCinemaMode) {
        e.preventDefault();
        exitCinemaMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isCinemaMode, toggleCinemaMode, exitCinemaMode]);

  // Listen for fullscreen change (in case user exits via browser controls)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isCinemaMode) {
        setIsCinemaMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isCinemaMode]);

  // Sound Handlers (Web Audio API 효과음)
  const toggleSound = useCallback(() => {
    if (!isSoundEnabled) {
      // 사운드 켜기 - AudioContext 초기화 (Autoplay Policy 대응)
      const success = soundEngine.init();
      if (success) {
        setSoundInitialized(true);
        setIsSoundEnabled(true);
        soundEngine.resume();
      }
    } else {
      // 사운드 끄기
      soundEngine.stopAll();
      setIsSoundEnabled(false);
    }
  }, [isSoundEnabled]);

  // Sound Effect Integration - leg 변화 감지 및 사운드 재생
  useEffect(() => {
    if (!isSoundEnabled || !soundInitialized || !myTripIsPlaying || myTripWaypoints.length < 2) {
      // 사운드 비활성화 또는 재생 중지 시 현재 사운드 정리
      if (currentSoundStopRef.current) {
        currentSoundStopRef.current();
        currentSoundStopRef.current = null;
      }
      return;
    }

    // Calculate current leg index
    const totalLegs = myTripWaypoints.length - 1;
    const progressPerLeg = 1 / totalLegs;
    const currentLegIdx = Math.min(Math.floor(myTripProgress / progressPerLeg), totalLegs - 1);

    // Leg 변경 감지 - 새 구간 시작 시 사운드 변경
    if (currentLegIdx !== lastLegIndexRef.current) {
      // 이전 사운드 정지
      if (currentSoundStopRef.current) {
        currentSoundStopRef.current();
        currentSoundStopRef.current = null;
      }

      // 도착 차임벨 (첫 구간이 아닐 때)
      if (lastLegIndexRef.current !== -1 && lastLegIndexRef.current < currentLegIdx) {
        soundEngine.playArrivalChime();
      }

      // 새 구간 교통수단 사운드 시작
      const currentWaypoint = myTripWaypoints[currentLegIdx];
      const transport = currentWaypoint.transportToNext || 'plane';
      const isStart = currentLegIdx === 0 || lastLegIndexRef.current === -1;

      // 약간의 지연 후 교통수단 사운드 시작 (차임벨과 겹치지 않도록)
      setTimeout(() => {
        if (myTripIsPlaying && isSoundEnabled) {
          currentSoundStopRef.current = soundEngine.playTransportSound(transport, isStart);
        }
      }, isStart ? 0 : 500);

      lastLegIndexRef.current = currentLegIdx;
    }

    // 여정 완료 시 최종 차임벨
    if (myTripProgress >= 0.999 && lastLegIndexRef.current !== -2) {
      if (currentSoundStopRef.current) {
        currentSoundStopRef.current();
        currentSoundStopRef.current = null;
      }
      soundEngine.playArrivalChime();
      lastLegIndexRef.current = -2; // 완료 표시
    }
  }, [isSoundEnabled, soundInitialized, myTripIsPlaying, myTripProgress, myTripWaypoints]);

  // Sound cleanup on tab change or component unmount
  useEffect(() => {
    return () => {
      soundEngine.stopAll();
      soundEngine.cleanup();
    };
  }, []);

  // Sound cleanup when tab changes away from myTrip
  useEffect(() => {
    if (activeTab !== 'myTrip') {
      soundEngine.stopAll();
      if (currentSoundStopRef.current) {
        currentSoundStopRef.current();
        currentSoundStopRef.current = null;
      }
      lastLegIndexRef.current = -1;
    }
  }, [activeTab]);

  // Reset sound state when simulation stops
  useEffect(() => {
    if (!myTripIsPlaying) {
      if (currentSoundStopRef.current) {
        currentSoundStopRef.current();
        currentSoundStopRef.current = null;
      }
      lastLegIndexRef.current = -1;
    }
  }, [myTripIsPlaying]);

  // Calculate current leg info for cinema HUD
  const cinemaHudInfo = useMemo(() => {
    if (myTripWaypoints.length < 2) return null;

    // Calculate which leg we're on based on progress
    const totalLegs = myTripWaypoints.length - 1;
    const progressPerLeg = 1 / totalLegs;
    const currentLegIdx = Math.min(Math.floor(myTripProgress / progressPerLeg), totalLegs - 1);

    const fromWaypoint = myTripWaypoints[currentLegIdx];
    const toWaypoint = myTripWaypoints[currentLegIdx + 1];
    const transport = fromWaypoint.transportToNext || 'plane';
    const speed = TRANSPORT_SPEEDS[transport];

    const transportEmojis: Record<TransportMode, string> = {
      plane: '✈️', boat: '🚢', train: '🚆', bus: '🚌', car: '🚗'
    };

    // Calculate leg progress
    const legStartProgress = currentLegIdx * progressPerLeg;
    const legProgress = (myTripProgress - legStartProgress) / progressPerLeg;

    return {
      fromName: fromWaypoint.name,
      toName: toWaypoint.name,
      fromCode: fromWaypoint.countryCode,
      toCode: toWaypoint.countryCode,
      transport,
      transportEmoji: transportEmojis[transport],
      speed,
      legIndex: currentLegIdx,
      totalLegs,
      legProgress,
      isArriving: legProgress > 0.9,
    };
  }, [myTripWaypoints, myTripProgress]);

  // My Trip Save/Load Handlers
  const handleSaveTrip = async () => {
    if (!supabase) {
      setTripSaveMessage({ type: 'error', text: 'Supabase가 설정되지 않았습니다.' });
      return;
    }
    if (myTripWaypoints.length < 2) {
      setTripSaveMessage({ type: 'error', text: '2개 이상의 국가가 필요합니다.' });
      return;
    }
    if (!saveTripTitle.trim()) {
      setTripSaveMessage({ type: 'error', text: '여정 제목을 입력해주세요.' });
      return;
    }

    setIsSavingTrip(true);
    try {
      const deviceId = getDeviceId();
      const { error } = await supabase.from('my_trips').insert({
        device_id: deviceId,
        title: saveTripTitle.trim(),
        waypoints: myTripWaypoints,
        total_distance_km: myTripTotalStats.totalKm,
        total_time_hours: myTripTotalStats.totalHours,
      });

      if (error) throw error;

      setTripSaveMessage({ type: 'success', text: '여정이 저장되었습니다!' });
      setSaveTripTitle('');
      setTimeout(() => {
        setShowSaveTripModal(false);
        setTripSaveMessage(null);
      }, 1500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message :
        (err && typeof err === 'object' && 'message' in err) ? String((err as { message: string }).message) : '알 수 없는 오류';
      // 테이블 없음 에러 체크
      if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
        setTripSaveMessage({ type: 'error', text: 'my_trips 테이블이 없습니다. Supabase에서 테이블을 생성해주세요.' });
      } else {
        setTripSaveMessage({ type: 'error', text: `저장 실패: ${errorMsg}` });
      }
    } finally {
      setIsSavingTrip(false);
    }
  };

  const handleLoadSavedTrips = async () => {
    if (!supabase) {
      setTripSaveMessage({ type: 'error', text: 'Supabase가 설정되지 않았습니다.' });
      return;
    }

    setIsLoadingTrips(true);
    try {
      const deviceId = getDeviceId();
      const { data, error } = await supabase
        .from('my_trips')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedTrips(data || []);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message :
        (err && typeof err === 'object' && 'message' in err) ? String((err as { message: string }).message) : '알 수 없는 오류';
      if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
        setTripSaveMessage({ type: 'error', text: 'my_trips 테이블이 없습니다. Supabase에서 테이블을 생성해주세요.' });
      } else {
        setTripSaveMessage({ type: 'error', text: `불러오기 실패: ${errorMsg}` });
      }
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const handleSelectSavedTrip = (trip: SavedTrip) => {
    setMyTripWaypoints(trip.waypoints);
    setMyTripProgress(0);
    setMyTripIsPlaying(false);
    setShowLoadTripModal(false);

    // 카메라 포커싱
    if (leafletMapRef.current && trip.waypoints.length > 0) {
      const latLngs = trip.waypoints.map((w) => [w.lat, w.lng] as [number, number]);
      leafletMapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60], maxZoom: 6 });
    }
  };

  const handleDeleteSavedTrip = async (tripId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase.from('my_trips').delete().eq('id', tripId);
      if (error) throw error;
      setSavedTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      console.error('Delete trip error:', err);
      setTripSaveMessage({ type: 'error', text: '삭제 중 오류가 발생했습니다.' });
    }
  };

  const handleOpenSaveModal = () => {
    if (myTripWaypoints.length < 2) {
      setTripSaveMessage({ type: 'error', text: '2개 이상의 국가를 추가해주세요.' });
      setTimeout(() => setTripSaveMessage(null), 2000);
      return;
    }
    setTripSaveMessage(null);
    setShowSaveTripModal(true);
  };

  const handleOpenLoadModal = () => {
    setTripSaveMessage(null);
    setShowLoadTripModal(true);
    handleLoadSavedTrips();
  };

  // Preset Trip Handlers
  const handleOpenPresetModal = () => {
    setShowPresetModal(true);
    setPresetContinent('아시아');
  };

  const handleSelectPresetTrip = (preset: TripPreset) => {
    // 기존 여정이 있으면 확인 팝업
    if (myTripWaypoints.length > 0) {
      setConfirmPresetLoad(preset);
    } else {
      loadPresetTrip(preset);
    }
  };

  const loadPresetTrip = (preset: TripPreset) => {
    // 프리셋 waypoints를 실제 MyTripWaypoint로 변환
    const newWaypoints: MyTripWaypoint[] = [];
    preset.waypoints.forEach((pw, idx) => {
      const country = WORLD_COUNTRIES.find((c) => c.code === pw.countryCode);
      if (!country) {
        console.warn(`Country not found: ${pw.countryCode}`);
        return;
      }

      // 도시 코스인 경우 cityName과 custom lat/lng 사용
      const isCityPreset = pw.cityName && pw.lat !== undefined && pw.lng !== undefined;
      const displayName = isCityPreset ? `${pw.cityName} (${country.ko})` : country.ko;
      const lat = isCityPreset ? pw.lat! : country.lat;
      const lng = isCityPreset ? pw.lng! : country.lng;

      newWaypoints.push({
        id: `${pw.countryCode}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
        name: displayName,
        countryCode: pw.countryCode,
        lat: lat,
        lng: lng,
        order: idx,
        transportToNext: pw.transportToNext,
      });
    });

    setMyTripWaypoints(newWaypoints);
    setMyTripProgress(0);
    setMyTripIsPlaying(false);
    setShowPresetModal(false);
    setConfirmPresetLoad(null);

    // 카메라 포커싱
    if (leafletMapRef.current && newWaypoints.length > 0) {
      const latLngs = newWaypoints.map((w) => [w.lat, w.lng] as [number, number]);
      setTimeout(() => {
        leafletMapRef.current?.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60], maxZoom: 6 });
      }, 100);
    }
  };

  const handleConfirmPresetLoad = () => {
    if (confirmPresetLoad) {
      loadPresetTrip(confirmPresetLoad);
    }
  };

  const handleCancelPresetLoad = () => {
    setConfirmPresetLoad(null);
  };

  // Loading state for hydration
  if (!mounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-pulse text-lg">지도 로딩 중...</div>
      </div>
    );
  }

  return (
    <div ref={cinemaContainerRef} className={`relative w-full h-screen overflow-hidden flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans select-none ${isCinemaMode ? 'cinema-mode' : ''}`}>
      {/* MAP */}
      <div className={`relative flex-1 w-full order-1 md:order-2 transition-all duration-500 ${isCinemaMode ? 'h-full' : 'h-[50vh] md:h-full'}`}>
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-900" />

        {/* CINEMA MODE HUD */}
        {isCinemaMode && cinemaHudInfo && (
          <>
            {/* Top HUD - Cinematic Subtitle */}
            <div className="absolute top-0 left-0 right-0 z-[100] pointer-events-none">
              <div className="bg-gradient-to-b from-black/70 via-black/30 to-transparent pt-6 pb-16 px-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-4 mb-3">
                    <img src={`https://flagcdn.com/w40/${cinemaHudInfo.fromCode.toLowerCase()}.png`} alt="" className="w-10 h-7 rounded shadow-lg" />
                    <span className="text-4xl">{cinemaHudInfo.transportEmoji}</span>
                    <img src={`https://flagcdn.com/w40/${cinemaHudInfo.toCode.toLowerCase()}.png`} alt="" className="w-10 h-7 rounded shadow-lg" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg tracking-wide">
                    {cinemaHudInfo.fromName.split('(')[0].trim()} → {cinemaHudInfo.toName.split('(')[0].trim()}
                  </h2>
                  <p className="text-sm md:text-base text-white/80 mt-2 font-medium">
                    {cinemaHudInfo.transportEmoji} 구간 {cinemaHudInfo.legIndex + 1} / {cinemaHudInfo.totalLegs} 이동 중 • 시속 {cinemaHudInfo.speed.toLocaleString()}km/h
                  </p>
                  {cinemaHudInfo.isArriving && (
                    <div className="mt-3 px-4 py-1.5 bg-emerald-500/90 text-white text-sm font-bold rounded-full animate-pulse shadow-lg">
                      🎯 곧 도착합니다
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Mini Controller - Glassmorphism */}
            <div className="absolute bottom-0 left-0 right-0 z-[100] pointer-events-auto">
              <div className="bg-gradient-to-t from-black/70 via-black/30 to-transparent pb-6 pt-16 px-4">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-4">
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.001"
                        value={myTripProgress}
                        onChange={(e) => {
                          setMyTripIsPlaying(false);
                          setMyTripProgress(parseFloat(e.target.value));
                        }}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-400"
                      />
                      <div className="flex justify-between text-xs text-white/60 mt-1 font-mono">
                        <span>{Math.round(myTripProgress * 100)}%</span>
                        <span>{myTripWaypoints.length}개 목적지</span>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Play/Pause */}
                      <button
                        onClick={() => setMyTripIsPlaying(!myTripIsPlaying)}
                        className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-2xl hover:brightness-110 active:scale-95 transition shadow-lg shadow-violet-500/30"
                      >
                        {myTripIsPlaying ? '⏸' : '▶'}
                      </button>

                      {/* Speed Controls */}
                      <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                        {[0.5, 1, 2, 4].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setMyTripSpeedMultiplier(spd)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${myTripSpeedMultiplier === spd ? 'bg-violet-500 text-white shadow' : 'text-white/70 hover:text-white'}`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

                      {/* Sound Toggle */}
                      <button
                        onClick={toggleSound}
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition ${isSoundEnabled ? 'bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400/50' : 'bg-white/10 text-white/70 border-2 border-transparent hover:bg-white/20'}`}
                        title="효과음 ON/OFF"
                      >
                        <span className="text-xl">{isSoundEnabled ? '🔊' : '🔇'}</span>
                      </button>

                      {/* Exit Cinema Mode */}
                      <button
                        onClick={exitCinemaMode}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition border border-white/20"
                      >
                        <span>✕</span>
                        <span className="hidden sm:inline">나가기</span>
                        <span className="text-xs text-white/50 hidden md:inline">(ESC)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TOP OVERLAY - Hidden in cinema mode */}
        <div className={`absolute top-4 left-4 right-4 md:left-6 md:right-6 z-30 pointer-events-none flex flex-wrap items-center justify-between gap-3 transition-opacity duration-300 ${isCinemaMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {activeTab === 'cruise' ? (
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/70 shadow-2xl flex items-center space-x-3 text-sm">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeLegInfo.dockedPort ? 'bg-amber-400' : 'bg-cyan-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${activeLegInfo.dockedPort ? 'bg-amber-500' : 'bg-cyan-500'}`}></span>
              </span>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  {activeLegInfo.dockedPort ? (
                    <span className="text-amber-400 flex items-center gap-1"><IconAnchor className="w-3.5 h-3.5" /><span>기항지 입항 완료</span></span>
                  ) : (
                    <span className="text-cyan-400 flex items-center gap-1"><IconAnchor className="w-3.5 h-3.5" /><span>해상 항해 중 (구간 {activeLegInfo.legNum} / {activeLegInfo.totalLegs})</span></span>
                  )}
                </div>
                <div className="font-semibold text-slate-200 text-xs sm:text-sm">
                  {activeLegInfo.dockedPort ? (
                    <span className="text-amber-300 font-bold flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-mono text-[11px]">[{getCountryInfo(activeLegInfo.dockedPort.country).code}] {getCountryInfo(activeLegInfo.dockedPort.country).ko}</span>
                      <FlagIcon code={getCountryInfo(activeLegInfo.dockedPort.country).code} fallbackEmoji={getCountryInfo(activeLegInfo.dockedPort.country).flag} size="sm" />
                      <span>⚓ {activeLegInfo.dockedPort.name} 기항 중</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-mono text-[10px]">[{getCountryInfo(activeLegInfo.fromCountry).code}]</span>
                      <FlagIcon code={getCountryInfo(activeLegInfo.fromCountry).code} fallbackEmoji={getCountryInfo(activeLegInfo.fromCountry).flag} size="xs" />
                      <span>{activeLegInfo.fromName.split(' ')[0]}</span>
                      <span className="text-cyan-400">➔</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-mono text-[10px]">[{getCountryInfo(activeLegInfo.toCountry).code}]</span>
                      <FlagIcon code={getCountryInfo(activeLegInfo.toCountry).code} fallbackEmoji={getCountryInfo(activeLegInfo.toCountry).flag} size="xs" />
                      <span>{activeLegInfo.toName.split(' ')[0]}</span>
                      <span className="ml-1.5 text-cyan-300 font-mono text-xs">({activeLegInfo.legPercent}%)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'myTrip' ? (
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-violet-500/40 shadow-2xl flex items-center space-x-3 text-sm">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${myTripIsPlaying ? 'bg-violet-400' : 'bg-fuchsia-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${myTripIsPlaying ? 'bg-violet-500' : 'bg-fuchsia-500'}`}></span>
              </span>
              <div>
                <div className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
                  ✈️ 나만의 여정 {myTripWaypoints.length > 0 && <span className="px-1.5 py-0.2 rounded-full bg-violet-400/20 text-[9px] font-mono text-violet-300 border border-violet-400/40">{myTripWaypoints.length}개국</span>}
                </div>
                <div className="font-semibold text-slate-200 text-xs sm:text-sm">
                  {myTripWaypoints.length < 2 ? (
                    <span className="text-slate-400">국가를 2개 이상 추가해주세요</span>
                  ) : myTripIsPlaying ? (
                    <span className="text-violet-300 flex items-center gap-1.5">
                      <span>{myTripWaypoints[myTripCurrentMotion.currentLegIndex]?.name || ''}</span>
                      <span className="text-fuchsia-400">➔</span>
                      <span>{myTripWaypoints[myTripCurrentMotion.currentLegIndex + 1]?.name || myTripWaypoints[myTripWaypoints.length - 1]?.name}</span>
                      <span className="ml-1 text-fuchsia-300 font-mono text-[10px]">({Math.round(myTripProgress * 100)}%)</span>
                    </span>
                  ) : (
                    <span className="text-slate-300">{myTripWaypoints[0]?.name} → {myTripWaypoints[myTripWaypoints.length - 1]?.name}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/40 shadow-2xl flex items-center space-x-3 text-sm">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <IconFlag className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <span>세계 여행 여권</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-[9px] font-mono text-amber-300 border border-amber-400/40">탐험율 {visitedStats.worldPercent}%</span>
                </div>
                <div className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                  <span>총 <strong className="text-amber-400 text-base">{visitedStats.count}</strong>개국 깃발 세움</span>
                </div>
              </div>
            </div>
          )}

          {/* MAP CONTROLS */}
          <div className="pointer-events-auto flex items-center space-x-1.5 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs">
            {(['dark', 'satellite', 'light', 'korean'] as const).map((theme) => (
              <button key={theme} onClick={() => setMapTheme(theme)} className={`px-2.5 py-1 rounded-xl transition cursor-pointer font-medium ${mapTheme === theme ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                {theme === 'dark' ? '다크' : theme === 'satellite' ? '위성' : theme === 'light' ? '라이트' : '🇰🇷 한글'}
              </button>
            ))}
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <button onClick={() => leafletMapRef.current?.zoomIn()} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 transition cursor-pointer text-sm font-bold border border-slate-700">+</button>
            <button onClick={() => leafletMapRef.current?.zoomOut()} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 transition cursor-pointer text-sm font-bold border border-slate-700">-</button>
            <button onClick={fitBoundsForCurrentTab} className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 transition cursor-pointer border border-slate-700">
              <IconMaximize2 className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">맞춤</span>
            </button>
          </div>
        </div>

        {/* BOTTOM TELEMETRY */}
        {activeTab === 'cruise' && (
          <div className="absolute bottom-6 left-6 z-10 hidden sm:flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl pointer-events-auto">
            <div className="flex items-center space-x-1.5"><IconCompass className="w-4 h-4 text-cyan-400" /><span>방위각: <strong className="text-white">{Math.round(currentMotion.heading)}°</strong></span></div>
            <div className="h-3 w-px bg-slate-700" />
            <div>위도: <span className="font-mono text-cyan-300">{currentMotion.lat.toFixed(4)}</span></div>
            <div>경도: <span className="font-mono text-cyan-300">{currentMotion.lng.toFixed(4)}</span></div>
          </div>
        )}
        {activeTab === 'myTrip' && myTripWaypoints.length >= 2 && (
          <div className="absolute bottom-6 left-6 z-10 hidden sm:flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md border border-violet-500/40 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl pointer-events-auto">
            <div className="flex items-center space-x-1.5"><IconCompass className="w-4 h-4 text-violet-400" /><span>방위각: <strong className="text-white">{Math.round(myTripCurrentMotion.heading)}°</strong></span></div>
            <div className="h-3 w-px bg-slate-700" />
            <div>위도: <span className="font-mono text-violet-300">{myTripCurrentMotion.lat.toFixed(4)}</span></div>
            <div>경도: <span className="font-mono text-violet-300">{myTripCurrentMotion.lng.toFixed(4)}</span></div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="text-fuchsia-300">구간: {myTripCurrentMotion.currentLegIndex + 1}/{myTripWaypoints.length - 1}</div>
          </div>
        )}
      </div>

      {/* SIDEBAR - Hidden in cinema mode */}
      <div className={`w-full md:w-[450px] lg:w-[480px] h-[50vh] md:h-full bg-slate-900/95 border-t md:border-t-0 md:border-r border-slate-800 flex flex-col z-20 shadow-2xl order-2 md:order-1 overflow-hidden transition-all duration-500 ${isCinemaMode ? 'hidden' : ''}`}>
        {/* TAB SWITCHER */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-2xl border border-slate-800 w-full">
            <button onClick={() => setActiveTab('visited')} className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${activeTab === 'visited' ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-slate-200'}`}>
              <IconFlag className="w-3.5 h-3.5" /><span>가본 나라</span><span className="px-1 py-0.2 rounded-full bg-black/25 text-[9px] font-mono">{visitedCountries.length}</span>
            </button>
            <button onClick={() => setActiveTab('myTrip')} className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${activeTab === 'myTrip' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-slate-200'}`}>
              <span>✈️</span><span>나만의 여정</span>{myTripWaypoints.length > 0 && <span className="px-1 py-0.2 rounded-full bg-black/25 text-[9px] font-mono">{myTripWaypoints.length}</span>}
            </button>
            <button onClick={() => setActiveTab('cruise')} className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${activeTab === 'cruise' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-slate-200'}`}>
              <IconShip className="w-3.5 h-3.5" /><span>크루즈</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'visited' ? (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* STATS CARD */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-4 rounded-2xl border border-amber-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🗺️</span>
                  <div><h2 className="text-sm font-bold text-white">나의 글로벌 여행 여권</h2><p className="text-[11px] text-slate-400">지도 위에 국기 깃발을 꽂고 여행 기록을 남겨보세요</p></div>
                </div>
                <span className="text-base font-extrabold text-amber-400 font-mono">{visitedStats.count} <span className="text-xs text-slate-400 font-normal">/ 204개국</span></span>
              </div>
              <div className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-[10px]">
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : syncStatus === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-slate-400'}`} />
                  <span className="text-slate-300 font-medium">{syncStatus === 'synced' ? '클라우드 자동 저장 활성화' : syncStatus === 'connecting' ? '저장소 연결 중...' : '로컬 모드 실행 중'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400"><span>세계 탐험 지수</span><span className="text-amber-400 font-bold">{visitedStats.worldPercent}% 달성</span></div>
                <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(3, parseFloat(visitedStats.worldPercent)))}%` }} /></div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                {Object.entries(visitedStats.continentCounts).map(([cont, num]) => (
                  <span key={cont} className={`px-2 py-0.5 rounded-lg border text-[10px] font-medium flex items-center gap-1 ${num > 0 ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500'}`}><span>{cont}</span><strong className="font-mono">{num}</strong></span>
                ))}
              </div>
            </div>

            {/* SEARCH */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between"><span>가본 나라 검색 & 깃발 꽂기</span></label>
              <div className="relative">
                <input type="text" value={countrySearchQuery} onChange={(e) => setCountrySearchQuery(e.target.value)} placeholder="예: 일본, 프랑스, 미국..." className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition" />
                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                {countrySearchQuery && <button onClick={() => setCountrySearchQuery('')} className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white">✕</button>}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <input type="text" value={newVisitYear} onChange={(e) => setNewVisitYear(e.target.value)} placeholder="방문 연도" className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono" />
                <input type="text" value={newVisitNote} onChange={(e) => setNewVisitNote(e.target.value)} placeholder="한줄 메모" className="col-span-2 w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400" />
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-1 text-[11px] scrollbar-none">
                {['전체', '아시아', '유럽', '아메리카', '오세아니아', '아프리카'].map((cont) => (
                  <button key={cont} onClick={() => setCountryFilterContinent(cont)} className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition text-[10px] ${countryFilterContinent === cont ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}>{cont}</button>
                ))}
              </div>
            </div>

            {/* COUNTRY LIST */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-medium"><span>국가 목록</span><span className="font-mono text-amber-400">{filteredSearchCountries.length}개</span></div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredSearchCountries.map((c) => {
                  const isVisited = visitedCountries.some((v) => v.code === c.code);
                  return (
                    <button key={c.code} onClick={() => handleToggleVisitedCountry(c)} className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${isVisited ? 'bg-amber-950/40 border-amber-500/80 text-white shadow-sm' : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'}`}>
                      <div className="flex items-center space-x-2.5 truncate">
                        <FlagIcon code={c.code} fallbackEmoji={c.flag} size="md" />
                        <div className="truncate"><div className="text-xs font-semibold truncate">{c.ko}</div><div className="text-[10px] text-slate-400 font-mono">[{c.code}]</div></div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isVisited ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-400'}`}>{isVisited ? '🚩' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VISITED LIST */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5"><IconFlag className="w-3.5 h-3.5" /><span>내가 깃발 세운 나라 ({visitedCountries.length})</span></h3>
                {visitedCountries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsPassportModalOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 rounded-lg border border-cyan-500/30 hover:border-cyan-400 transition"
                    >
                      📸 SNS 카드
                    </button>
                    <button
                      onClick={() => setIsStickerModalOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 rounded-lg border border-amber-500/30 hover:border-amber-400 transition"
                    >
                      🖨️ 스티커
                    </button>
                  </div>
                )}
              </div>
              {visitedCountries.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800">아직 깃발을 꽂은 나라가 없습니다.</div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {visitedCountries.map((c) => {
                    const weather = weatherCache[c.code];
                    const exchange = getExchangeDisplay(c.code);
                    return (
                      <div
                        key={c.code}
                        onClick={() => leafletMapRef.current?.setView([c.lat, c.lng], 6, { animate: true })}
                        onMouseEnter={() => fetchWeather(c.lat, c.lng, c.code)}
                        className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <FlagIcon code={c.code} fallbackEmoji={c.flag} size="lg" />
                            <div>
                              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <span className="px-1 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/50 font-mono text-[9px]">{c.code}</span>
                                <span>{c.ko}</span>
                                {c.year && <span className="text-[10px] text-amber-400 font-mono font-medium">({c.year})</span>}
                              </div>
                              {c.note && <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">&quot;{c.note}&quot;</div>}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveVisitedCountry(c.code); }} className="p-1 rounded text-rose-400 hover:bg-rose-950/40 opacity-70 group-hover:opacity-100 transition"><IconTrash className="w-3.5 h-3.5" /></button>
                        </div>
                        {/* Weather & Exchange Mini Widget */}
                        <div className="flex items-center gap-2 mt-1.5 ml-8">
                          {weather ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30">
                              {weather.emoji} {weather.temperature}°C
                            </span>
                          ) : isLoadingWeather[c.code] ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">⏳</span>
                          ) : null}
                          {exchange && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                              💱 {exchange}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'myTrip' ? (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* PRESET TRIP BUTTON */}
            <button onClick={handleOpenPresetModal} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-sm font-bold hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-orange-500/25">
              ✨ 추천 코스 둘러보기
            </button>

            {/* SAVE/LOAD BUTTONS & TOAST */}
            <div className="flex items-center justify-between gap-2">
              <button onClick={handleOpenSaveModal} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-lg shadow-emerald-500/20">
                💾 여정 저장
              </button>
              <button onClick={handleOpenLoadModal} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-lg shadow-blue-500/20">
                📂 불러오기
              </button>
            </div>
            {tripSaveMessage && (
              <div className={`text-center py-2 px-3 rounded-xl text-xs font-medium ${tripSaveMessage.type === 'success' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950/50 text-rose-400 border border-rose-500/30'}`}>
                {tripSaveMessage.text}
              </div>
            )}

            {/* MY TRIP PLAYBACK */}
            <div className="bg-gradient-to-br from-violet-950/50 to-fuchsia-950/50 p-3.5 rounded-2xl border border-violet-500/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-2">✈️ 여정 시뮬레이션</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setMyTripIsLooping(!myTripIsLooping)} className={`text-[10px] px-1.5 py-0.5 rounded-md transition border ${myTripIsLooping ? 'bg-violet-500/20 text-violet-300 border-violet-500/40' : 'bg-slate-700/50 text-slate-400 border-transparent'}`}>반복 {myTripIsLooping ? 'ON' : 'OFF'}</button>
                  <button onClick={() => setMyTripCameraTracking(!myTripCameraTracking)} className={`text-[10px] px-1.5 py-0.5 rounded-md transition border ${myTripCameraTracking ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' : 'bg-slate-700/50 text-slate-400 border-transparent'}`}>📷 {myTripCameraTracking ? 'ON' : 'OFF'}</button>
                  <button onClick={toggleSound} className={`text-[10px] px-1.5 py-0.5 rounded-md transition border ${isSoundEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-700/50 text-slate-400 border-transparent'}`} title="효과음 (Web Audio)">🔊 {isSoundEnabled ? 'ON' : 'OFF'}</button>
                </div>
              </div>
              {myTripWaypoints.length < 2 ? (
                <div className="text-center py-4 text-slate-400 text-xs">2개 이상의 국가를 추가하면 여정을 시작할 수 있습니다</div>
              ) : (
                <>
                  <input type="range" min="0" max="1" step="0.001" value={myTripProgress} onChange={(e) => { setMyTripIsPlaying(false); setMyTripProgress(parseFloat(e.target.value)); }} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-400" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setMyTripIsPlaying(!myTripIsPlaying)} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-bold text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-violet-500/20">{myTripIsPlaying ? '⏸ 일시정지' : '▶ 출발!'}</button>
                      <button onClick={handleMyTripReset} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">↺</button>
                      {/* Cinema Mode Button */}
                      <button
                        onClick={enterCinemaMode}
                        className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-[10px] hover:brightness-110 active:scale-95 transition shadow-lg shadow-amber-500/20"
                        title="시네마 모드 (F)"
                      >
                        <span>🎬</span>
                        <span className="hidden sm:inline">시네마</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700/80">
                      {[0.5, 1, 2, 4].map((spd) => (
                        <button key={spd} onClick={() => setMyTripSpeedMultiplier(spd)} className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${myTripSpeedMultiplier === spd ? 'bg-violet-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{spd}x</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* MY TRIP WAYPOINTS LIST */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-violet-300 flex items-center gap-1.5">🗺️ 내 여행 코스 ({myTripWaypoints.length})</h3>
                {myTripWaypoints.length > 0 && (
                  <button onClick={handleClearMyTrip} className="text-[10px] px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-500/30 hover:bg-rose-900/50 transition">전체 삭제</button>
                )}
              </div>
              {/* 총 거리/시간 요약 */}
              {myTripWaypoints.length >= 2 && myTripTotalStats.totalKm > 0 && (
                <div className="flex items-center justify-center gap-4 py-2 px-3 bg-gradient-to-r from-violet-950/60 to-fuchsia-950/60 rounded-xl border border-violet-500/30">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">총 거리</span>
                    <span className="text-cyan-400 font-bold font-mono">{myTripTotalStats.formattedDistance}</span>
                  </div>
                  <div className="h-3 w-px bg-slate-700" />
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">예상 이동시간</span>
                    <span className="text-amber-400 font-bold font-mono">{myTripTotalStats.formattedTime}</span>
                  </div>
                </div>
              )}
              {myTripWaypoints.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800">아래에서 국가를 검색해 여정에 추가하세요</div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {myTripWaypoints.map((w, idx) => {
                    const country = WORLD_COUNTRIES.find(c => c.code === w.countryCode);
                    const isLast = idx === myTripWaypoints.length - 1;
                    return (
                      <div key={w.id} className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/50 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${idx === 0 ? 'bg-emerald-500 text-slate-950 border-emerald-300' : isLast ? 'bg-fuchsia-500 text-white border-fuchsia-300' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>{idx === 0 ? '🚩' : isLast ? '🏁' : idx + 1}</div>
                            <div className="flex items-center gap-1.5">
                              <FlagIcon code={w.countryCode} fallbackEmoji={country?.flag || '🌐'} size="sm" />
                              <span className="text-xs font-semibold text-slate-200">{w.name}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">{w.countryCode}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button onClick={() => handleMoveMyTripWaypoint(idx, idx - 1)} disabled={idx === 0} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300">▲</button>
                            <button onClick={() => handleMoveMyTripWaypoint(idx, idx + 1)} disabled={isLast} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300">▼</button>
                            <button onClick={() => handleRemoveFromMyTrip(w.id)} className="p-1 rounded text-rose-400 hover:bg-rose-950/40 transition"><IconTrash className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        {!isLast && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-800/50 space-y-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-500">이동:</span>
                              {(['plane', 'boat', 'train', 'bus', 'car'] as TransportMode[]).map((mode) => {
                                const icons: Record<TransportMode, string> = { plane: '✈️', boat: '🚢', train: '🚆', bus: '🚌', car: '🚗' };
                                const isActive = w.transportToNext === mode;
                                return (
                                  <button key={mode} onClick={() => handleSetLegTransport(idx, mode)} className={`text-[11px] px-1.5 py-0.5 rounded transition ${isActive ? 'bg-violet-500/30 border border-violet-400/50' : 'opacity-50 hover:opacity-100'}`}>{icons[mode]}</button>
                                );
                              })}
                            </div>
                            {myTripLegInfos[idx] && (
                              <div className="flex items-center gap-2 text-[9px] text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg">
                                <span className="flex items-center gap-1">📍 <span className="text-cyan-400 font-mono">{myTripLegInfos[idx].formattedDistance}</span></span>
                                <span className="text-slate-600">·</span>
                                <span className="flex items-center gap-1">⏱️ <span className="text-amber-400 font-mono">{myTripLegInfos[idx].formattedTime}</span></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CITY/LANDMARK SEARCH (Nominatim) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">🔍 도시/랜드마크 검색</label>
              <div className="relative">
                <input
                  type="text"
                  value={nominatimQuery}
                  onChange={(e) => handleNominatimQueryChange(e.target.value)}
                  onFocus={() => nominatimResults.length > 0 && setShowNominatimDropdown(true)}
                  placeholder="예: 에펠탑, 도쿄, 콜로세움..."
                  className="w-full bg-slate-900 border border-amber-700/50 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
                {isSearchingNominatim ? (
                  <div className="w-4 h-4 absolute left-3 top-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconSearch className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                )}
                {nominatimQuery && (
                  <button onClick={() => { setNominatimQuery(''); setNominatimResults([]); setShowNominatimDropdown(false); }} className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white">✕</button>
                )}
                {/* Search Results Dropdown */}
                {showNominatimDropdown && nominatimResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {nominatimResults.map((result) => {
                      const countryCode = result.address?.country_code?.toUpperCase() || 'XX';
                      const cityName = result.name || result.display_name.split(',')[0];
                      const countryInfo = WORLD_COUNTRIES.find(c => c.code === countryCode);
                      return (
                        <button
                          key={result.place_id}
                          onClick={() => handleSelectNominatimResult(result)}
                          className="w-full text-left px-3 py-2 hover:bg-amber-950/40 border-b border-slate-800 last:border-b-0 transition flex items-center gap-2"
                        >
                          <FlagIcon code={countryCode} fallbackEmoji={countryInfo?.flag || '🌐'} size="sm" />
                          <div className="flex-1 truncate">
                            <div className="text-xs font-semibold text-white truncate">{cityName}</div>
                            <div className="text-[10px] text-slate-400 truncate">{result.display_name}</div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">+</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500">전 세계 도시, 관광지, 랜드마크를 검색하여 여정에 추가하세요.</p>
            </div>

            {/* ADD COUNTRY SEARCH */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">🌍 나라 선택 (빠른 추가)</label>
              <div className="relative">
                <input type="text" value={myTripSearchQuery} onChange={(e) => setMyTripSearchQuery(e.target.value)} placeholder="예: 일본, 프랑스, 미국..." className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition" />
                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                {myTripSearchQuery && <button onClick={() => setMyTripSearchQuery('')} className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white">✕</button>}
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-1 text-[11px] scrollbar-none">
                {['전체', '아시아', '유럽', '아메리카', '오세아니아', '아프리카'].map((cont) => (
                  <button key={cont} onClick={() => setMyTripFilterContinent(cont)} className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition text-[10px] ${myTripFilterContinent === cont ? 'bg-violet-500 text-white font-bold shadow' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}>{cont}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {myTripFilteredCountries.slice(0, 30).map((c) => (
                  <button key={c.code} onClick={() => handleAddToMyTrip(c)} className="p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-violet-950/30 hover:border-violet-500/50">
                    <div className="flex items-center space-x-2 truncate">
                      <FlagIcon code={c.code} fallbackEmoji={c.flag} size="md" />
                      <div className="truncate"><div className="text-xs font-semibold truncate">{c.ko}</div><div className="text-[9px] text-slate-500 font-mono">[{c.code}]</div></div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">+</span>
                  </button>
                ))}
              </div>
              {myTripFilteredCountries.length > 30 && <div className="text-center text-[10px] text-slate-500">+ {myTripFilteredCountries.length - 30}개 더</div>}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-5 flex-1 overflow-y-auto">
            {/* PLAYBACK */}
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/60 space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>항해 애니메이션</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setIsLooping(!isLooping)} className={`text-[11px] px-2 py-0.5 rounded-md transition border ${isLooping ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-700/50 text-slate-400 border-transparent'}`}>반복 {isLooping ? 'ON' : 'OFF'}</button>
                  <span className="font-mono text-slate-300">{speedMultiplier}x</span>
                </div>
              </div>
              <input type="range" min="0" max="1" step="0.001" value={progress} onChange={(e) => { setIsPlaying(false); setProgress(parseFloat(e.target.value)); }} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-cyan-500/20">{isPlaying ? '⏸ 일시정지' : '▶ 항해 시작'}</button>
                  <button onClick={() => { setProgress(0); setIsPlaying(true); }} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">↺</button>
                </div>
                <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700/80">
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button key={spd} onClick={() => setSpeedMultiplier(spd)} className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${speedMultiplier === spd ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>{spd}x</button>
                  ))}
                </div>
              </div>
            </div>

            {/* PRESETS */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">크루즈 여행지 선택</label>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {CRUISE_REGIONS.map((region) => (
                  <button key={region} onClick={() => setSelectedRegion(region)} className={`px-2 py-1 rounded-lg whitespace-nowrap transition ${selectedRegion === region ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent'}`}>{region}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredPresets.map((preset) => (
                  <button key={preset.id} onClick={() => handleSelectPreset(preset)} className={`w-full text-left p-2 rounded-xl border text-xs transition flex items-center justify-between ${selectedPresetId === preset.id ? 'bg-cyan-950/40 border-cyan-500/70 text-white shadow-sm' : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800'}`}>
                    <div>
                      <div className="font-semibold flex items-center gap-1.5"><span>{preset.name}</span>{preset.badge && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">{preset.badge}</span>}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{preset.subtitle}</div>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono whitespace-nowrap ml-2">{preset.waypoints.length}개 항구</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ITINERARY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-300">기항지 일정</label>
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                    <button onClick={() => setItineraryViewMode('table')} className={`px-2 py-0.5 rounded font-medium transition ${itineraryViewMode === 'table' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>📊 표</button>
                    <button onClick={() => setItineraryViewMode('cards')} className={`px-2 py-0.5 rounded font-medium transition ${itineraryViewMode === 'cards' ? 'bg-cyan-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>카드</button>
                  </div>
                </div>
              </div>

              {itineraryViewMode === 'table' ? (
                <div className="rounded-xl border border-emerald-900/60 overflow-hidden bg-slate-950/80 shadow-inner">
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead><tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider"><th className="py-1.5 px-2 text-center w-8">No</th><th className="py-1.5 px-2">국가</th><th className="py-1.5 px-2">항구</th><th className="py-1.5 px-2 text-center">상태</th><th className="py-1.5 px-2 text-center w-12">삭제</th></tr></thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                        {waypoints.map((port, idx) => {
                          const status = getPortStatus(idx, waypoints.length, progress);
                          const countryInfo = getCountryInfo(port.country);
                          return (
                            <tr key={port.id} className={`transition ${status === 'docked' ? 'bg-amber-950/30 text-amber-200 font-bold' : status === 'visited' ? 'bg-emerald-950/20 text-slate-200' : 'bg-slate-900/30 text-slate-300 hover:bg-slate-800/50'}`}>
                              <td className="py-2 px-2 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                              <td className="py-2 px-2"><span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-semibold text-[10px]"><FlagIcon code={countryInfo.code} fallbackEmoji={countryInfo.flag} size="xs" showBorder={false} /><span className="bg-emerald-500 text-slate-950 px-1 py-0.1 rounded text-[8px] font-bold">{countryInfo.code}</span>{countryInfo.ko}</span></td>
                              <td className="py-2 px-2 font-sans font-medium text-slate-200">{port.name}</td>
                              <td className="py-2 px-2 text-center">{status === 'docked' ? <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold animate-pulse">⚓</span> : status === 'visited' ? <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✓</span> : <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">-</span>}</td>
                              <td className="py-2 px-2 text-center"><button onClick={() => handleRemovePort(idx)} className="p-1 rounded text-rose-400 hover:bg-rose-950/40 transition"><IconTrash className="w-3 h-3" /></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {waypoints.map((port, idx) => {
                    const status = getPortStatus(idx, waypoints.length, progress);
                    const countryInfo = getCountryInfo(port.country);
                    const portWeatherKey = `port-${port.id}`;
                    const portWeather = weatherCache[portWeatherKey];
                    return (
                      <div
                        key={port.id}
                        onMouseEnter={() => fetchWeather(port.lat, port.lng, portWeatherKey)}
                        className={`p-2 rounded-xl border text-xs transition ${status === 'docked' ? 'bg-amber-950/40 border-amber-500/80 text-white shadow-md' : status === 'visited' ? 'bg-emerald-950/30 border-emerald-600/60 text-slate-200' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${status === 'docked' ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse' : status === 'visited' ? 'bg-emerald-500 text-slate-950 border-emerald-300' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{status === 'visited' ? '✓' : idx + 1}</div>
                            <div className="font-medium flex items-center gap-1.5 flex-wrap">
                              <FlagIcon code={countryInfo.code} fallbackEmoji={countryInfo.flag} size="sm" showBorder={false} />
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-mono text-[10px] font-bold">[{countryInfo.code}]</span>
                              <span>{port.name}</span>
                              {portWeather && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30">
                                  {portWeather.emoji}{portWeather.temperature}°
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button onClick={() => handleMovePort(idx, idx - 1)} disabled={idx === 0} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300">▲</button>
                            <button onClick={() => handleMovePort(idx, idx + 1)} disabled={idx === waypoints.length - 1} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300">▼</button>
                            <button onClick={() => handleRemovePort(idx)} className="p-1 rounded text-rose-400 hover:bg-rose-950/40 transition"><IconTrash className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ADD PORT */}
              <form onSubmit={handleAddPort} className="pt-2 border-t border-slate-800 flex gap-2">
                <input type="text" value={newPortName} onChange={(e) => setNewPortName(e.target.value)} placeholder="추가 기항지 검색 (예: 나폴리)" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400" />
                <button type="submit" disabled={isSearchingPort} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition flex items-center gap-1 disabled:opacity-50"><IconPlus className="w-3.5 h-3.5" /><span>{isSearchingPort ? '...' : '추가'}</span></button>
              </form>
              {portError && <div className="text-[11px] text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-800/40">{portError}</div>}
            </div>

            {/* TRANSIT MODE */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">이동 마커</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: 'boat', label: '크루즈선' }, { id: 'plane', label: '항공편' }, { id: 'car', label: '육상' }, { id: 'arrow', label: '화살표' }].map((v) => (
                  <button key={v.id} onClick={() => setTransitMode(v.id)} className={`flex items-center space-x-2.5 p-2 rounded-xl border text-xs font-medium transition text-left ${transitMode === v.id ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>{v.label}</button>
                ))}
              </div>
            </div>

            {/* CURVATURE */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between text-xs text-slate-400"><span>항로 곡률</span><span className="font-mono text-slate-300">{curvature.toFixed(2)}</span></div>
              <input type="range" min="-0.2" max="0.25" step="0.01" value={curvature} onChange={(e) => setCurvature(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="p-2.5 border-t border-slate-800 text-center text-[10px] text-slate-500 bg-slate-950/80">크루즈 & 가본 나라 깃발 여권 트래커</div>
      </div>

      {/* Travel Sticker Modal */}
      <TravelStickerModal
        isOpen={isStickerModalOpen}
        onClose={() => setIsStickerModalOpen(false)}
        visitedCountries={visitedCountries}
      />

      {/* Travel Passport Modal */}
      <TravelPassportModal
        isOpen={isPassportModalOpen}
        onClose={() => setIsPassportModalOpen(false)}
        visitedCountries={visitedCountries}
      />

      {/* Save Trip Modal */}
      {showSaveTripModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-violet-500/40 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">💾 여정 저장</h2>
              <button onClick={() => { setShowSaveTripModal(false); setTripSaveMessage(null); }} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">여정 제목</label>
                <input
                  type="text"
                  value={saveTripTitle}
                  onChange={(e) => setSaveTripTitle(e.target.value)}
                  placeholder="예: 2026 이탈리아 일주"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition"
                />
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
                <div className="text-xs text-slate-400">저장할 여정 정보</div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-violet-300 font-semibold">{myTripWaypoints.length}개국</span>
                  <span className="text-cyan-400">{myTripTotalStats.formattedDistance}</span>
                  <span className="text-amber-400">{myTripTotalStats.formattedTime}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {myTripWaypoints.map(w => w.name).join(' → ')}
                </div>
              </div>
              {tripSaveMessage && (
                <div className={`text-center py-2 rounded-lg text-xs ${tripSaveMessage.type === 'success' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-rose-950/50 text-rose-400'}`}>
                  {tripSaveMessage.text}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => { setShowSaveTripModal(false); setTripSaveMessage(null); }} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition">취소</button>
              <button onClick={handleSaveTrip} disabled={isSavingTrip || !saveTripTitle.trim()} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {isSavingTrip ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Trip Modal */}
      {showLoadTripModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">📂 저장된 여정 불러오기</h2>
              <button onClick={() => { setShowLoadTripModal(false); setTripSaveMessage(null); }} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            {tripSaveMessage && (
              <div className={`text-center py-2 rounded-lg text-xs ${tripSaveMessage.type === 'success' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-rose-950/50 text-rose-400'}`}>
                {tripSaveMessage.text}
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingTrips ? (
                <div className="text-center py-8 text-slate-400 text-sm">불러오는 중...</div>
              ) : savedTrips.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">저장된 여정이 없습니다.</div>
              ) : (
                savedTrips.map((trip) => (
                  <div key={trip.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelectSavedTrip(trip)}>
                        <div className="text-sm font-semibold text-white truncate">{trip.title}</div>
                        <div className="flex items-center gap-3 mt-1 text-[11px]">
                          <span className="text-violet-300">{trip.waypoints.length}개국</span>
                          <span className="text-cyan-400">{trip.total_distance_km >= 1000 ? `${(trip.total_distance_km / 1000).toFixed(1)}천km` : `${Math.round(trip.total_distance_km).toLocaleString()}km`}</span>
                          <span className="text-amber-400">{formatTravelTime(trip.total_time_hours)}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-1 truncate">
                          {trip.waypoints.map(w => w.name).join(' → ')}
                        </div>
                        <div className="text-[9px] text-slate-600 mt-0.5">
                          {new Date(trip.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button onClick={() => handleSelectSavedTrip(trip)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition">불러오기</button>
                        <button onClick={() => handleDeleteSavedTrip(trip.id)} className="p-1.5 rounded-lg bg-rose-950/50 text-rose-400 hover:bg-rose-900/50 transition">
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => { setShowLoadTripModal(false); setTripSaveMessage(null); }} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition">닫기</button>
          </div>
        </div>
      )}

      {/* Preset Trip Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-orange-500/40 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">✨ 추천 여행 코스</h2>
              <button onClick={() => setShowPresetModal(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            {/* Continent Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl overflow-x-auto">
              {(['아시아', '유럽', '아프리카', '미주', '도시코스'] as PresetContinent[]).map((cont) => {
                const icons: Record<PresetContinent, string> = { '아시아': '🌏', '유럽': '🏰', '아프리카': '🦁', '미주': '🗽', '도시코스': '🏙️' };
                return (
                  <button
                    key={cont}
                    onClick={() => setPresetContinent(cont)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${presetContinent === cont ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span>{icons[cont]}</span>
                    <span>{cont}</span>
                  </button>
                );
              })}
            </div>

            {/* Preset Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {TRIP_PRESETS.filter((p) => p.continent === presetContinent).map((preset) => {
                const badgeColors: Record<string, string> = {
                  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                  violet: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
                  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
                  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
                  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
                  lime: 'bg-lime-500/20 text-lime-400 border-lime-500/40',
                  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
                  fuchsia: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40',
                  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
                  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
                };
                const transportIcons: Record<TransportMode, string> = { plane: '✈️', boat: '🚢', train: '🚆', bus: '🚌', car: '🚗' };

                return (
                  <div key={preset.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-orange-500/50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-white">{preset.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badgeColors[preset.badgeColor] || badgeColors.amber}`}>{preset.badge}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{preset.description}</div>
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {preset.waypoints.map((pw, idx) => {
                            const country = WORLD_COUNTRIES.find((c) => c.code === pw.countryCode);
                            const isLast = idx === preset.waypoints.length - 1;
                            // 도시 코스인 경우 도시 이름 표시, 아니면 국가 이름
                            const displayLabel = pw.cityName || country?.ko || pw.countryCode;
                            return (
                              <span key={`${preset.id}-${idx}`} className="flex items-center gap-0.5">
                                <span className="flex items-center gap-1 text-[10px] text-slate-300 bg-slate-900/50 px-1.5 py-0.5 rounded">
                                  <img src={`https://flagcdn.com/w20/${pw.countryCode.toLowerCase()}.png`} alt={pw.countryCode} className="w-3 h-2 rounded-sm object-cover" />
                                  {displayLabel}
                                </span>
                                {!isLast && <span className="text-[10px] text-slate-500 mx-0.5">{transportIcons[pw.transportToNext || 'plane']}</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectPresetTrip(preset)}
                        className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-lg shadow-orange-500/20"
                      >
                        이 코스로 시작
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => setShowPresetModal(false)} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition">닫기</button>
          </div>
        </div>
      )}

      {/* Confirm Preset Load Modal */}
      {confirmPresetLoad && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold text-white">기존 여정 덮어쓰기</h3>
              <p className="text-sm text-slate-400 mt-2">현재 작성 중인 여정이 있습니다.<br/>&quot;{confirmPresetLoad.title}&quot; 코스로 대체할까요?</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleCancelPresetLoad} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition">취소</button>
              <button onClick={handleConfirmPresetLoad} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:brightness-110 transition">덮어쓰기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
