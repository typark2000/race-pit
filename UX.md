# UX.md — race-pit

## Product feel
빠르고 읽기 쉽고 긴장감 있는 전략 대시보드.
직접 운전하진 않지만, 매 순간 개입할 수 있어야 한다.

## Main screen layout
모바일 세로 기준 3영역:
1. top-view track
2. live order board
3. strategy controls

## Primary race screen
### Track area
- 단순화된 가상 트랙 라인
- 색상 팀 차량 아이콘 4대
- pit lane 시각화
- 현재 랩 / 총 랩 표시

### Order board
- 순위
- 드라이버/차량 색상
- gap
- tyre type
- tyre wear bar
- pit 예정/실행 상태

### Strategy controls
차량 A / 차량 B 각각:
- current tyre
- wear
- pace mode buttons
- pit now button
- next tyre select

## Information priority
1. 지금 몇 등인가
2. 타이어가 얼마나 남았나
3. 피트 들어갈 타이밍인가
4. 상대보다 언더컷 가능성이 있나

## Key UX rule
유저가 “레이스 상황을 읽는 시간”보다 “판단하는 시간”이 길어지면 안 된다.
즉 숫자와 시각 신호가 빨라야 한다.

## Visual cues
- tyre wear 70%+ = yellow
- tyre wear 85%+ = red
- pit window open = pulse/highlight
- push mode = stronger color glow
- conserve mode = muted indicator

## States
### Pre-race
- 짧은 브리핑
- 출발 타이어 선택
- 시작 버튼

### Racing
- 실시간 탑뷰
- 순위표 갱신
- 전략 입력 가능

### Pit event
- pit lane 진입/정차/복귀가 보임
- 손실 시간 명확히 보임

### Result
- finishing order
- strategy summary
- winning move highlight

## Empty/loading/error states
### Loading race
- "그리드 정렬 중"

### No action available
- pit disabled 이유 표시
- 예: "피트 구간 아님"

### Strategy lock moment
- pit lane 진입 이후 타이어 변경 불가

## Copy tone
- 짧고 경기 중계처럼
- 예:
  - "지금 들어가면 언더컷 가능"
  - "타이어가 급격히 무너진다"
  - "한 바퀴 더 버티기엔 위험"

## MVP simplification
- 첫 버전은 튜토리얼 없이도 읽혀야 함
- 컨트롤은 최소:
  - pace 3개
  - pit now
  - next tyre

## Accessibility/readability
- 색만으로 상태를 전달하지 않기
- 타이어/페이스는 아이콘+텍스트 동시 사용
- 작은 화면에서 숫자가 너무 많지 않게
