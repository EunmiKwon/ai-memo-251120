import { Memo } from '@/types/memo'
import { localStorageUtils } from './localStorage'
import { supabase } from '@/lib/supabaseClient'

/**
 * 로컬 스토리지의 메모 데이터를 Supabase로 마이그레이션
 * 한 번만 실행되도록 설계됨
 */
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  try {
    // Supabase에 데이터가 있는지 확인
    const { data: existingMemos, error: fetchError } = await supabase
      .from('memos')
      .select('id')
      .limit(1)

    if (fetchError) {
      console.error('Error checking Supabase data:', fetchError)
      return false
    }

    // Supabase에 데이터가 이미 있으면 마이그레이션하지 않음
    if (existingMemos && existingMemos.length > 0) {
      console.log('Supabase already has data, skipping migration')
      return false
    }

    // 로컬 스토리지에서 메모 가져오기
    const localMemos = localStorageUtils.getMemos()

    if (localMemos.length === 0) {
      console.log('No local data to migrate')
      return false
    }

    // Supabase 형식으로 변환 (snake_case로 변환)
    const memosToInsert = localMemos.map((memo: Memo) => ({
      id: memo.id,
      title: memo.title,
      content: memo.content,
      category: memo.category,
      tags: memo.tags || [],
      ai_summary: memo.aiSummary || null,
      created_at: memo.createdAt,
      updated_at: memo.updatedAt,
    }))

    // Supabase에 삽입
    const { error: insertError } = await supabase
      .from('memos')
      .insert(memosToInsert)

    if (insertError) {
      console.error('Error migrating data to Supabase:', insertError)
      return false
    }

    // 마이그레이션 성공 후 로컬 스토리지 정리
    localStorageUtils.clearMemos()
    console.log(`Successfully migrated ${localMemos.length} memos to Supabase`)

    return true
  } catch (error) {
    console.error('Migration error:', error)
    return false
  }
}

