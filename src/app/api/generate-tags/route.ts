import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 내용이 필요합니다.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' })

    const prompt = `다음 메모의 제목과 내용을 분석하여 적절한 태그를 추천해주세요. 
태그는 단어로만 추천해주세요. # 기호는 포함하지 마세요. 3-5개 정도 추천해주세요.
태그는 JSON 배열 형식으로만 응답해주세요. 다른 설명 없이 배열만 반환해주세요.

제목: ${title}
내용: ${content.substring(0, 1000)}

응답 형식: ["태그1", "태그2", "태그3"]`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text().trim()

    // JSON 배열 파싱 시도
    let tags: string[] = []
    try {
      // 응답에서 JSON 배열 부분만 추출
      const jsonMatch = responseText.match(/\[.*\]/s)
      if (jsonMatch) {
        tags = JSON.parse(jsonMatch[0])
      } else {
        // JSON 배열이 아닌 경우 쉼표로 구분된 태그로 처리
        tags = responseText
          .split(',')
          .map(tag => tag.trim().replace(/^["'\[\]]|["'\[\]]$/g, ''))
          .filter(tag => tag.length > 0)
      }
    } catch (error) {
      console.error('태그 파싱 오류:', error, '응답:', responseText)
      tags = []
    }

    // 태그에서 # 제거 및 정리
    tags = tags
      .map(tag => tag.trim().replace(/^#+/, '').trim())
      .filter(tag => tag.length > 0)

    // 태그 개수 제한 (최대 5개)
    tags = tags.slice(0, 5)

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('태그 생성 오류:', error)
    return NextResponse.json(
      { error: '태그 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

