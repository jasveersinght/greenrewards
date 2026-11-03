import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      // Allow fallback SVG/placeholder generator for testing
      const placeholder = `/placeholder-leak-${Date.now()}.jpg`
      return NextResponse.json({ url: placeholder })
    }

    // Convert file to Base64 data URL for instant zero-disk-dependency portability
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({ url: dataUrl })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Upload failed' },
      { status: 500 }
    )
  }
}
