import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function POST(request: NextRequest) {
  try {
    const { content, title, memoId } = await request.json()

    // 환경변수는 함수 내부에서 읽어야 서버 사이드에서 제대로 동작함
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' })

    const prompt = `다음 메모를 간결하고 명확하게 요약해주세요. 핵심 내용만 2-3문장으로 정리해주세요.

${title ? `제목: ${title}\n` : ''}내용:
${content}

요약:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const summary = response.text()

    // memoId가 제공된 경우 Supabase에 저장
    let saveError: string | null = null
    let saved = false
    
    if (memoId) {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase environment variables are not configured', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey,
        })
        saveError = 'Supabase 환경변수가 설정되지 않았습니다.'
      } else {
        try {
          console.log('Attempting to save summary to Supabase for memo:', memoId)
          const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
          
          const { error: updateError, data } = await supabase
            .from('memos')
            .update({ ai_summary: summary })
            .eq('id', memoId)
            .select()

          if (updateError) {
            console.error('Failed to save summary to Supabase:', {
              error: updateError,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code,
            })
            saveError = `데이터베이스 저장 실패: ${updateError.message}`
          } else if (data && data.length > 0) {
            console.log('Summary saved successfully to Supabase for memo:', memoId, {
              updatedRows: data.length,
            })
            saved = true
          } else {
            console.warn('No rows were updated. Memo might not exist:', memoId)
            saveError = '메모를 찾을 수 없습니다.'
          }
        } catch (dbError) {
          console.error('Error saving summary to database:', dbError)
          saveError = `데이터베이스 저장 중 오류: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
        }
      }
    } else {
      console.warn('memoId가 제공되지 않아 요약을 데이터베이스에 저장하지 않습니다.')
      saveError = 'memoId가 제공되지 않았습니다.'
    }

    return NextResponse.json({ 
      summary,
      saved,
      saveError: saveError || undefined
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

