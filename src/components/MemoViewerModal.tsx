'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import '@uiw/react-markdown-preview/markdown.css'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview'),
  { ssr: false }
)

interface MemoViewerModalProps {
  memo: Memo
  isOpen: boolean
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onMemoUpdated?: () => void
}

const categoryStyles: Record<string, string> = {
  personal: 'bg-blue-100 text-blue-800',
  work: 'bg-green-100 text-green-800',
  study: 'bg-purple-100 text-purple-800',
  idea: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function MemoViewerModal({
  memo,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMemoUpdated,
}: MemoViewerModalProps) {
  const [summary, setSummary] = useState<string>(memo.aiSummary || '')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string>('')

  useEffect(() => {
    // 메모가 변경될 때 저장된 요약 표시
    setSummary(memo.aiSummary || '')
    setSummaryError('')
    setIsSummarizing(false)
  }, [memo.id, memo.aiSummary])

  useEffect(() => {
    if (!isOpen) {
      // 모달이 닫힐 때 요약 상태 초기화
      setSummary(memo.aiSummary || '')
      setSummaryError('')
      setIsSummarizing(false)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, memo.aiSummary])

  const handleSummarize = async () => {
    setIsSummarizing(true)
    setSummaryError('')
    setSummary('')

    try {
      const response = await fetch('/api/memos/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: memo.content,
          title: memo.title,
          memoId: memo.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '요약 생성에 실패했습니다.')
      }

      setSummary(data.summary)

      // 저장 오류가 있으면 사용자에게 알림
      if (data.saveError) {
        console.warn('요약은 생성되었지만 데이터베이스 저장에 실패:', data.saveError)
        setSummaryError(`요약은 생성되었지만 저장에 실패했습니다: ${data.saveError}`)
      }

      // 요약이 저장되었으므로 메모 목록을 새로고침
      if (data.saved && onMemoUpdated) {
        onMemoUpdated()
      }
    } catch (error) {
      console.error('Error summarizing memo:', error)
      setSummaryError(
        error instanceof Error
          ? error.message
          : '요약 생성 중 오류가 발생했습니다.'
      )
    } finally {
      setIsSummarizing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const categoryLabel =
    MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ||
    memo.category
  const categoryColor =
    categoryStyles[memo.category] || categoryStyles.other

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      } transition-opacity`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full ${categoryColor}`}
              >
                {categoryLabel}
              </span>
              <span className="text-sm text-gray-500">
                업데이트: {formatDate(memo.updatedAt)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{memo.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4" data-color-mode="light">
          <MarkdownPreview source={memo.content || ''} />
        </div>

        {memo.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {memo.tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 요약 섹션 */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">요약</h3>
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSummarizing ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>요약 중...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>요약 생성</span>
                </>
              )}
            </button>
          </div>

          {summaryError && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {summaryError}
            </div>
          )}

          {summary && (
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm leading-relaxed text-gray-800">{summary}</p>
            </div>
          )}

          {!summary && !summaryError && !isSummarizing && (
            <p className="text-sm text-gray-500">
              위 버튼을 클릭하여 메모를 요약할 수 있습니다.
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
          <button
            onClick={() => onEdit(memo)}
            className="inline-flex items-center justify-center rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            편집
          </button>
          <button
            onClick={() => {
              if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
                onDelete(memo.id)
              }
            }}
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

