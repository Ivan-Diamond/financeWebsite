import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/layouts - Get all layouts for current user
export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const layouts = await prisma.layout.findMany({
      where: { userId: session.user.id },
      include: { widgets: true },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ layouts })
  } catch (error) {
    console.error('Failed to fetch layouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch layouts' },
      { status: 500 }
    )
  }
}

// POST /api/layouts - Create new layout
export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, widgets, isDefault } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Layout name is required' },
        { status: 400 }
      )
    }

    // If this layout is set as default, unset all others
    if (isDefault) {
      await prisma.layout.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false }
      })
    }

    // Create layout with widgets
    const layout = await prisma.layout.create({
      data: {
        name,
        userId: session.user.id,
        isDefault: isDefault || false,
        gridConfig: {
          cols: 12,
          rowHeight: 60,
          compactType: 'vertical',
        },
        widgets: {
          create: (widgets || []).map((widget: any) => ({
            type: widget.type,
            config: widget.config || {},
            gridX: widget.layout?.x || 0,
            gridY: widget.layout?.y || 0,
            gridW: widget.layout?.w || 4,
            gridH: widget.layout?.h || 3,
          })),
        },
      },
      include: { widgets: true },
    })

    return NextResponse.json({ layout })
  } catch (error) {
    console.error('Failed to create layout:', error)
    return NextResponse.json(
      { error: 'Failed to create layout' },
      { status: 500 }
    )
  }
}
