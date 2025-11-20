<!-- 4a9fb138-0bc6-440c-a236-aab493e06276 413d808c-4da5-475c-9c16-605d5b1c8ad8 -->
# 메모 상세 뷰 모달 계획

1. 상태/핸들러 확장 (`src/app/page.tsx`)

- 상세 보기용 `selectedMemo`/`isViewerOpen` 상태와 `openViewer`, `closeViewer` 핸들러를 추가.
- 편집/삭제 콜백을 재사용해 모달 내부 버튼에서도 `MemoForm`과 삭제 로직을 호출하도록 구성.

2. 카드 클릭 이벤트 전달 (`src/components/MemoList.tsx`, `src/components/MemoItem.tsx`)

- `MemoList` → `MemoItem`에 `onView` 콜백을 내려주고, 카드 전체 클릭 시 호출.
- 편집/삭제 버튼 클릭 시 이벤트 전파를 막아 카드 클릭과 충돌하지 않도록 정리.

3. 상세 모달 컴포넌트 구현 (`src/components/MemoViewerModal.tsx`)

- 오버레이 + 모달 뷰를 만들고 memo 정보를 표시, 태그/카테고리/타임스탬프를 포함.
- ESC keydown, 배경 클릭 시 `onClose` 실행하도록 effect/핸들러 구현.
- 모달 내부에 편집/삭제 버튼을 배치해 상위에서 전달한 콜백을 호출.