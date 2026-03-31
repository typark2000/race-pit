# SPEC.md — race-pit

## Project
`race-pit`

## One-line
탑뷰 레이싱 시뮬레이션을 보면서 피트스톱, 타이어, 페이스 전략으로 순위를 뒤집는 실시간 전략 게임.

## Product premise
유저는 직접 운전하지 않는다. 차들은 트랙을 자동으로 달리고, 유저는 두 대의 레이스카를 관리하면서 전략 지시만 내린다.

## Inspiration boundary
레퍼런스는 “실시간 레이싱 매니지먼트 + 피트 전략” 장르지만,
- `F1`
- 실제 팀명
- 실제 드라이버명
- 실제 서킷명
- 실제 리그/브랜드 자산
은 사용하지 않는다.

## Safe fiction layer
- 팀은 색상 기반: `Green`, `Orange`, `Red`, `Navy`, `Black`, `Silver`, `Purple`, `Yellow`
- 드라이버는 가명
- 서킷은 가상 맵
- 타이어도 일반화: `Soft`, `Medium`, `Hard`, `Wet`
- 월드관은 “프로 레이싱 전략 리그” 정도로 추상화

## Core fantasy
- 눈앞에서 순위가 바뀌는 걸 본다
- 직접 운전은 안 하지만 결과를 내 손으로 바꾼다
- 짧은 판단 하나가 승부를 가른다
- “지금 들어가야 하나?”라는 압박이 핵심 재미다

## Core loop
1. 레이스 시작
2. 차량이 자동 주행
3. 유저가 타이어/페이스/피트 타이밍 판단
4. 트랙 상황(혼잡, 날씨, 타이어 마모, 언더컷/오버컷)에 대응
5. 두 차량의 총합 성적으로 승패 결정
6. 리워드/업그레이드/다음 경기

## MVP scope
### In
- 2 cars vs 2 rivals
- top-view track visualization
- lap progress / order board
- tyre wear system
- pit stop command
- pace mode (push / normal / conserve)
- simple overtaking model
- race result screen

### Out (v1)
- full multiplayer
- collectible driver economy
- complex car setup tree
- live weather forecast model
- safety car / damage / fuel systems
- monetization

## Match structure
- 1 race = 2~4 minutes
- 6~10 laps
- 유저는 두 차량 동시 운영
- 라이벌도 동일 규칙으로 AI 운영

## Main decisions for MVP
### 1. Strategy depth over realism
현실 고증보다 “읽기 쉽고 판단 재밌는 시스템” 우선.

### 2. Short sessions
모바일에서 짧게 한 판 가능한 구조.

### 3. Readable top-view
차량이 실제 3D처럼 보이기보다, 위에서 보기 쉬운 아이콘/레이싱 라인 중심.

## Systems
### Tyres
- Soft: 빠름 / 빨리 닳음
- Medium: 균형
- Hard: 느림 / 오래 감
- Wet: 비 전용

### Pace modes
- Push: 추월/랩타임 유리, 타이어 더 소모
- Normal: 기본
- Conserve: 타이어 아낌, 랩타임 손해

### Pit stop strategy
- 적절한 랩에 피트인
- 언더컷/오버컷 판단
- 두 차량 더블스택은 불리하게 설계 가능

### Event layer
MVP에서는 단순 event만:
- light rain
- tyre cliff
- traffic jam behind slower car

## Win condition
- 두 차량의 합산 포인트 또는 우선 순위 기준 승리
- MVP는 간단히 “더 높은 평균 순위” 또는 “상위 차량 우선” 방식으로 가능

## User stories
- 유저는 레이스를 보며 지금 피트에 들어갈지 빠르게 판단하고 싶다.
- 유저는 순위표를 보고 언더컷이 먹혔는지 확인하고 싶다.
- 유저는 내 두 차량의 전략을 다르게 가져가고 싶다.
- 유저는 한 판이 너무 길지 않길 원한다.

## Acceptance criteria
- 차량들이 자동 주행한다.
- 유저가 피트/타이어/페이스를 바꿀 수 있다.
- 탑뷰와 순위표만 봐도 상황이 읽힌다.
- 전략 변경이 실제 순위 변화에 영향을 준다.
- 1판이 2~4분 내외로 끝난다.

## Naming direction
working title ideas:
- `race-pit`
- `pitcall`
- `lap plan`
- `color grid`
- `grandstand strategy`

## My recommendation
임시 프로젝트명은 `race-pit`으로 가는 게 무난하다.
짧고 설명적이고, 법적 충돌 가능성도 낮다.
