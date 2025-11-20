'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Memo, MemoFormData } from '@/types/memo'
import { supabase } from '@/lib/supabaseClient'
import { migrateLocalStorageToSupabase } from '@/utils/migration'

// Supabase 데이터베이스 형식(snake_case)을 앱 형식(camelCase)으로 변환
const mapSupabaseToMemo = (row: any): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags || [],
  aiSummary: row.ai_summary || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드 함수
  const loadMemos = useCallback(async () => {
    setLoading(true)
    try {
      // 로컬 스토리지에서 Supabase로 마이그레이션 (한 번만 실행)
      await migrateLocalStorageToSupabase()

      // Supabase에서 메모 가져오기
      const { data, error } = await supabase
        .from('memos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load memos:', error)
        setMemos([])
      } else {
        const mappedMemos = (data || []).map(mapSupabaseToMemo)
        setMemos(mappedMemos)
      }
    } catch (error) {
      console.error('Failed to load memos:', error)
      setMemos([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 메모 로드
  useEffect(() => {
    loadMemos()
  }, [loadMemos])

  // 메모 생성
  const createMemo = useCallback(
    async (formData: MemoFormData): Promise<Memo> => {
      const newMemo: Memo = {
        id: uuidv4(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      try {
        // Supabase에 삽입
        const { data, error } = await supabase
          .from('memos')
          .insert({
            id: newMemo.id,
            title: newMemo.title,
            content: newMemo.content,
            category: newMemo.category,
            tags: newMemo.tags || [],
            created_at: newMemo.createdAt,
            updated_at: newMemo.updatedAt,
          })
          .select()
          .single()

        if (error) {
          console.error('Failed to create memo:', error)
          throw error
        }

        const createdMemo = mapSupabaseToMemo(data)
        setMemos(prev => [createdMemo, ...prev])
        return createdMemo
      } catch (error) {
        console.error('Error creating memo:', error)
        throw error
      }
    },
    []
  )

  // 메모 업데이트
  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<void> => {
      const existingMemo = memos.find(memo => memo.id === id)
      if (!existingMemo) return

      const updatedMemo: Memo = {
        ...existingMemo,
        ...formData,
        updatedAt: new Date().toISOString(),
      }

      try {
        // Supabase에서 업데이트
        const { data, error } = await supabase
          .from('memos')
          .update({
            title: updatedMemo.title,
            content: updatedMemo.content,
            category: updatedMemo.category,
            tags: updatedMemo.tags || [],
            updated_at: updatedMemo.updatedAt,
          })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Failed to update memo:', error)
          throw error
        }

        const mappedMemo = mapSupabaseToMemo(data)
        setMemos(prev => prev.map(memo => (memo.id === id ? mappedMemo : memo)))
      } catch (error) {
        console.error('Error updating memo:', error)
        throw error
      }
    },
    [memos]
  )

  // 메모 삭제
  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('memos').delete().eq('id', id)

      if (error) {
        console.error('Failed to delete memo:', error)
        throw error
      }

      setMemos(prev => prev.filter(memo => memo.id !== id))
    } catch (error) {
      console.error('Error deleting memo:', error)
      throw error
    }
  }, [])

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 모든 메모 삭제
  const clearAllMemos = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase.from('memos').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        console.error('Failed to clear memos:', error)
        throw error
      }

      setMemos([])
      setSearchQuery('')
      setSelectedCategory('all')
    } catch (error) {
      console.error('Error clearing memos:', error)
      throw error
    }
  }, [])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,

    // 유틸리티
    clearAllMemos,
    refreshMemos: loadMemos,
  }
}
