import type { CruisePreset, TransitMode } from '@/types';

export const CRUISE_PRESETS: CruisePreset[] = [
  // 1. 서부 지중해
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
  // 2. 동부 지중해 & 그리스 산토리니
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
  // 3. 카리브해
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
  // 4. 알래스카
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
  // 5. 노르웨이 피오르드
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
  // 6. 하와이
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
  // 7. 동남아
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
  },
  // 8. 단일 구간
  {
    id: 'single-ibiza-palermo',
    region: '서부 지중해',
    name: '이비자 ➔ 팔레르모 직행 단일 항로',
    subtitle: '서부 지중해 횡단 해상 루트',
    badge: '단일 구간',
    recommendedMode: 'boat',
    curvature: 0.12,
    waypoints: [
      { id: 's1', name: '이비자 (Ibiza, Spain)', country: '스페인', lat: 38.9067, lng: 1.4206, day: '출발' },
      { id: 's2', name: '팔레르모 (Palermo, Italy)', country: '이탈리아', lat: 38.1157, lng: 13.3615, day: '도착' }
    ]
  }
];

export const CRUISE_REGIONS = ['전체', '동부 지중해', '카리브해', '알래스카', '서부 지중해', '북유럽', '하와이', '동남아'];

export const TRANSIT_MODES: { id: TransitMode; label: string; icon: string }[] = [
  { id: 'boat', label: '크루즈선 (Cruise Ship)', icon: 'ship' },
  { id: 'arrow', label: '방향 화살표 (Arrow)', icon: 'arrow' },
  { id: 'plane', label: '항공편 (Flight)', icon: 'plane' },
  { id: 'car', label: '육상 코스 (Road Trip)', icon: 'car' }
];

export const DEFAULT_ROUTE_COORDS: [number, number][] = [
  [41.3879, 2.1699],
  [43.2965, 5.3698]
];
