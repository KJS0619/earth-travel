import type { Country, VisitedCountry, CountryInfo } from '@/types';

// Initial Default Visited Countries
export const INITIAL_VISITED_COUNTRIES: VisitedCountry[] = [
  { code: 'KR', ko: '대한민국', en: 'South Korea', flag: '🇰🇷', continent: '아시아', lat: 36.5, lng: 127.8, year: '거주', note: '홈그라운드' },
  { code: 'JP', ko: '일본', en: 'Japan', flag: '🇯🇵', continent: '아시아', lat: 35.6762, lng: 139.6503, year: '2023', note: '도쿄 & 오사카 미식 여행' },
  { code: 'FR', ko: '프랑스', en: 'France', flag: '🇫🇷', continent: '유럽', lat: 46.2276, lng: 2.2137, year: '2024', note: '파리 & 니스 지중해 코스' },
  { code: 'IT', ko: '이탈리아', en: 'Italy', flag: '🇮🇹', continent: '유럽', lat: 41.8719, lng: 12.5674, year: '2024', note: '로마 콜로세움 & 베네치아' },
  { code: 'ES', ko: '스페인', en: 'Spain', flag: '🇪🇸', continent: '유럽', lat: 40.4637, lng: -3.7492, year: '2025', note: '바르셀로나 사그라다 파밀리아' }
];

// Comprehensive Country Knowledge Base
export const WORLD_COUNTRIES: Country[] = [
  { code: 'KR', ko: '대한민국', en: 'South Korea', flag: '🇰🇷', continent: '아시아', lat: 36.5, lng: 127.8 },
  { code: 'JP', ko: '일본', en: 'Japan', flag: '🇯🇵', continent: '아시아', lat: 35.6762, lng: 139.6503 },
  { code: 'VN', ko: '베트남', en: 'Vietnam', flag: '🇻🇳', continent: '아시아', lat: 14.0583, lng: 108.2772 },
  { code: 'TH', ko: '태국', en: 'Thailand', flag: '🇹🇭', continent: '아시아', lat: 15.8700, lng: 100.9925 },
  { code: 'TW', ko: '대만', en: 'Taiwan', flag: '🇹🇼', continent: '아시아', lat: 23.6978, lng: 120.9605 },
  { code: 'PH', ko: '필리핀', en: 'Philippines', flag: '🇵🇭', continent: '아시아', lat: 12.8797, lng: 121.7740 },
  { code: 'SG', ko: '싱가포르', en: 'Singapore', flag: '🇸🇬', continent: '아시아', lat: 1.3521, lng: 103.8198 },
  { code: 'MY', ko: '말레이시아', en: 'Malaysia', flag: '🇲🇾', continent: '아시아', lat: 4.2105, lng: 101.9758 },
  { code: 'ID', ko: '인도네시아', en: 'Indonesia', flag: '🇮🇩', continent: '아시아', lat: -0.7893, lng: 113.9213 },
  { code: 'HK', ko: '홍콩', en: 'Hong Kong', flag: '🇭🇰', continent: '아시아', lat: 22.3193, lng: 114.1694 },
  { code: 'CN', ko: '중국', en: 'China', flag: '🇨🇳', continent: '아시아', lat: 35.8617, lng: 104.1954 },
  { code: 'IN', ko: '인도', en: 'India', flag: '🇮🇳', continent: '아시아', lat: 20.5937, lng: 78.9629 },
  { code: 'MN', ko: '몽골', en: 'Mongolia', flag: '🇲🇳', continent: '아시아', lat: 46.8625, lng: 103.8467 },
  { code: 'AE', ko: '아랍에미리트', en: 'United Arab Emirates', flag: '🇦🇪', continent: '아시아', lat: 23.4241, lng: 53.8478 },
  { code: 'FR', ko: '프랑스', en: 'France', flag: '🇫🇷', continent: '유럽', lat: 46.2276, lng: 2.2137 },
  { code: 'IT', ko: '이탈리아', en: 'Italy', flag: '🇮🇹', continent: '유럽', lat: 41.8719, lng: 12.5674 },
  { code: 'ES', ko: '스페인', en: 'Spain', flag: '🇪🇸', continent: '유럽', lat: 40.4637, lng: -3.7492 },
  { code: 'GB', ko: '영국', en: 'United Kingdom', flag: '🇬🇧', continent: '유럽', lat: 55.3781, lng: -3.4360 },
  { code: 'DE', ko: '독일', en: 'Germany', flag: '🇩🇪', continent: '유럽', lat: 51.1657, lng: 10.4515 },
  { code: 'CH', ko: '스위스', en: 'Switzerland', flag: '🇨🇭', continent: '유럽', lat: 46.8182, lng: 8.2275 },
  { code: 'AT', ko: '오스트리아', en: 'Austria', flag: '🇦🇹', continent: '유럽', lat: 47.5162, lng: 14.5501 },
  { code: 'CZ', ko: '체코', en: 'Czech Republic', flag: '🇨🇿', continent: '유럽', lat: 49.8175, lng: 15.4730 },
  { code: 'HU', ko: '헝가리', en: 'Hungary', flag: '🇭🇺', continent: '유럽', lat: 47.1625, lng: 19.5033 },
  { code: 'HR', ko: '크로아티아', en: 'Croatia', flag: '🇭🇷', continent: '유럽', lat: 45.1000, lng: 15.2000 },
  { code: 'GR', ko: '그리스', en: 'Greece', flag: '🇬🇷', continent: '유럽', lat: 39.0742, lng: 21.8243 },
  { code: 'TR', ko: '튀르키예', en: 'Turkey', flag: '🇹🇷', continent: '유럽', lat: 38.9637, lng: 35.2433 },
  { code: 'PT', ko: '포르투갈', en: 'Portugal', flag: '🇵🇹', continent: '유럽', lat: 39.3999, lng: -8.2245 },
  { code: 'NL', ko: '네덜란드', en: 'Netherlands', flag: '🇳🇱', continent: '유럽', lat: 52.1326, lng: 5.2913 },
  { code: 'BE', ko: '벨기에', en: 'Belgium', flag: '🇧🇪', continent: '유럽', lat: 50.5039, lng: 4.4699 },
  { code: 'NO', ko: '노르웨이', en: 'Norway', flag: '🇳🇴', continent: '유럽', lat: 60.4720, lng: 8.4689 },
  { code: 'SE', ko: '스웨덴', en: 'Sweden', flag: '🇸🇪', continent: '유럽', lat: 60.1282, lng: 18.6435 },
  { code: 'FI', ko: '핀란드', en: 'Finland', flag: '🇫🇮', continent: '유럽', lat: 61.9241, lng: 25.7482 },
  { code: 'DK', ko: '덴마크', en: 'Denmark', flag: '🇩🇰', continent: '유럽', lat: 56.2639, lng: 9.5018 },
  { code: 'IS', ko: '아이슬란드', en: 'Iceland', flag: '🇮🇸', continent: '유럽', lat: 64.9631, lng: -19.0208 },
  { code: 'IE', ko: '아일랜드', en: 'Ireland', flag: '🇮🇪', continent: '유럽', lat: 53.1424, lng: -7.6921 },
  { code: 'PL', ko: '폴란드', en: 'Poland', flag: '🇵🇱', continent: '유럽', lat: 51.9194, lng: 19.1451 },
  { code: 'US', ko: '미국', en: 'United States', flag: '🇺🇸', continent: '아메리카', lat: 37.0902, lng: -95.7129 },
  { code: 'CA', ko: '캐나다', en: 'Canada', flag: '🇨🇦', continent: '아메리카', lat: 56.1304, lng: -106.3468 },
  { code: 'MX', ko: '멕시코', en: 'Mexico', flag: '🇲🇽', continent: '아메리카', lat: 23.6345, lng: -102.5528 },
  { code: 'BR', ko: '브라질', en: 'Brazil', flag: '🇧🇷', continent: '아메리카', lat: -14.2350, lng: -51.9253 },
  { code: 'AR', ko: '아르헨티나', en: 'Argentina', flag: '🇦🇷', continent: '아메리카', lat: -38.4161, lng: -63.6167 },
  { code: 'CL', ko: '칠레', en: 'Chile', flag: '🇨🇱', continent: '아메리카', lat: -35.6751, lng: -71.5430 },
  { code: 'PE', ko: '페루', en: 'Peru', flag: '🇵🇪', continent: '아메리카', lat: -9.1899, lng: -75.0152 },
  { code: 'AU', ko: '호주', en: 'Australia', flag: '🇦🇺', continent: '오세아니아', lat: -25.2744, lng: 133.7751 },
  { code: 'NZ', ko: '뉴질랜드', en: 'New Zealand', flag: '🇳🇿', continent: '오세아니아', lat: -40.9006, lng: 174.8860 },
  { code: 'GU', ko: '괌', en: 'Guam', flag: '🇬🇺', continent: '오세아니아', lat: 13.4443, lng: 144.7937 },
  { code: 'MP', ko: '사이판', en: 'Saipan', flag: '🇲🇵', continent: '오세아니아', lat: 15.1833, lng: 145.7500 },
  { code: 'EG', ko: '이집트', en: 'Egypt', flag: '🇪🇬', continent: '아프리카', lat: 26.8206, lng: 30.8025 },
  { code: 'ZA', ko: '남아프리카공화국', en: 'South Africa', flag: '🇿🇦', continent: '아프리카', lat: -30.5595, lng: 22.9375 },
  { code: 'MA', ko: '모로코', en: 'Morocco', flag: '🇲🇦', continent: '아프리카', lat: 31.7917, lng: -7.0926 }
];

// ISO 2-letter Country Code & Korean Name Dictionary
export const COUNTRY_INFO_MAP: Record<string, CountryInfo> = {
  '이탈리아': { code: 'IT', ko: '이탈리아', en: 'Italy', flag: '🇮🇹' },
  'IT': { code: 'IT', ko: '이탈리아', en: 'Italy', flag: '🇮🇹' },
  '스페인': { code: 'ES', ko: '스페인', en: 'Spain', flag: '🇪🇸' },
  'ES': { code: 'ES', ko: '스페인', en: 'Spain', flag: '🇪🇸' },
  '프랑스': { code: 'FR', ko: '프랑스', en: 'France', flag: '🇫🇷' },
  'FR': { code: 'FR', ko: '프랑스', en: 'France', flag: '🇫🇷' },
  '그리스': { code: 'GR', ko: '그리스', en: 'Greece', flag: '🇬🇷' },
  'GR': { code: 'GR', ko: '그리스', en: 'Greece', flag: '🇬🇷' },
  '튀르키예': { code: 'TR', ko: '튀르키예', en: 'Turkey', flag: '🇹🇷' },
  'TR': { code: 'TR', ko: '튀르키예', en: 'Turkey', flag: '🇹🇷' },
  '미국 플로리다': { code: 'US', ko: '미국(플로리다)', en: 'USA', flag: '🇺🇸' },
  '미국 알래스카': { code: 'US', ko: '미국(알래스카)', en: 'USA', flag: '🇺🇸' },
  '미국 워싱턴': { code: 'US', ko: '미국(워싱턴)', en: 'USA', flag: '🇺🇸' },
  '하와이': { code: 'US', ko: '미국(하와이)', en: 'USA', flag: '🇺🇸' },
  '미국': { code: 'US', ko: '미국', en: 'USA', flag: '🇺🇸' },
  'US': { code: 'US', ko: '미국', en: 'USA', flag: '🇺🇸' },
  '미국령 버진아일랜드': { code: 'VI', ko: '버진아일랜드(미국령)', en: 'US Virgin Islands', flag: '🇻🇮' },
  '신트마르턴': { code: 'SX', ko: '신트마르턴', en: 'Sint Maarten', flag: '🇸🇽' },
  '푸에르토리코': { code: 'PR', ko: '푸에르토리코', en: 'Puerto Rico', flag: '🇵🇷' },
  '캐나다 BC': { code: 'CA', ko: '캐나다(BC)', en: 'Canada', flag: '🇨🇦' },
  '캐나다': { code: 'CA', ko: '캐나다', en: 'Canada', flag: '🇨🇦' },
  'CA': { code: 'CA', ko: '캐나다', en: 'Canada', flag: '🇨🇦' },
  '노르웨이': { code: 'NO', ko: '노르웨이', en: 'Norway', flag: '🇳🇴' },
  '노르웨이 피오르': { code: 'NO', ko: '노르웨이(피오르)', en: 'Norway', flag: '🇳🇴' },
  'NO': { code: 'NO', ko: '노르웨이', en: 'Norway', flag: '🇳🇴' },
  '싱가포르': { code: 'SG', ko: '싱가포르', en: 'Singapore', flag: '🇸🇬' },
  'SG': { code: 'SG', ko: '싱가포르', en: 'Singapore', flag: '🇸🇬' },
  '말레이시아': { code: 'MY', ko: '말레이시아', en: 'Malaysia', flag: '🇲🇾' },
  'MY': { code: 'MY', ko: '말레이시아', en: 'Malaysia', flag: '🇲🇾' },
  '태국': { code: 'TH', ko: '태국', en: 'Thailand', flag: '🇹🇭' },
  'TH': { code: 'TH', ko: '태국', en: 'Thailand', flag: '🇹🇭' },
  '일본': { code: 'JP', ko: '일본', en: 'Japan', flag: '🇯🇵' },
  'JP': { code: 'JP', ko: '일본', en: 'Japan', flag: '🇯🇵' },
  '한국': { code: 'KR', ko: '대한민국', en: 'South Korea', flag: '🇰🇷' },
  '대한민국': { code: 'KR', ko: '대한민국', en: 'South Korea', flag: '🇰🇷' },
  'KR': { code: 'KR', ko: '대한민국', en: 'South Korea', flag: '🇰🇷' },
  '바하마': { code: 'BS', ko: '바하마', en: 'Bahamas', flag: '🇧🇸' }
};

export function getCountryInfo(rawCountry: string | undefined): CountryInfo {
  if (!rawCountry) return { code: 'GL', ko: '기타/해상', en: 'Global', flag: '🌐' };
  const trimmed = rawCountry.trim();
  if (COUNTRY_INFO_MAP[trimmed]) return COUNTRY_INFO_MAP[trimmed];

  for (const [key, val] of Object.entries(COUNTRY_INFO_MAP)) {
    if (trimmed.includes(key) || key.includes(trimmed)) return val;
  }
  const matchWorld = WORLD_COUNTRIES.find(
    c => c.ko === trimmed || c.en.toLowerCase() === trimmed.toLowerCase() || c.code === trimmed.toUpperCase()
  );
  if (matchWorld) return { code: matchWorld.code, ko: matchWorld.ko, en: matchWorld.en, flag: matchWorld.flag };

  return { code: 'GL', ko: trimmed, en: trimmed, flag: '🌐' };
}

export const CONTINENTS = ['전체', '아시아', '유럽', '아메리카', '오세아니아', '아프리카'];
