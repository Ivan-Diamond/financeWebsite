import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/layouts/[id] - Get single layout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const layout = await prisma.layout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: { widgets: true },
    })

    if (!layout) {
      return NextResponse.json(
        { error: 'Layout not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ layout })
  } catch (error) {
    console.error('Failed to fetch layout:', error)
    return NextResponse.json(
      { error: 'Failed to fetch layout' },
      { status: 500 }
    )
  }
}

// PUT /api/layouts/[id] - Update layout
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, widgets, isDefault } = body

    // Verify ownership
    const existingLayout = await prisma.layout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingLayout) {
      return NextResponse.json(
        { error: 'Layout not found' },
        { status: 404 }
      )
    }

    // If this layout is set as default, unset all others
    if (isDefault) {
      await prisma.layout.updateMany({
        where: {
          userId: session.user.id,
          id: { not: id },
        },
        data: { isDefault: false },
      })
    }

    // Delete existing widgets
    await prisma.widget.deleteMany({
      where: { layoutId: id },
    })

    // Update layout with new widgets
    const layout = await prisma.layout.update({
      where: { id },
      data: {
        name: name || existingLayout.name,
        isDefault: isDefault !== undefined ? isDefault : existingLayout.isDefault,
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
    console.error('Failed to update layout:', error)
    return NextResponse.json(
      { error: 'Failed to update layout' },
      { status: 500 }
    )
  }
}

// DELETE /api/layouts/[id] - Delete layout
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Verify ownership
    const layout = await prisma.layout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!layout) {
      return NextResponse.json(
        { error: 'Layout not found' },
        { status: 404 }
      )
    }

    // Delete layout (widgets will cascade)
    await prisma.layout.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete layout:', error)
    return NextResponse.json(
      { error: 'Failed to delete layout' },
      { status: 500 }
    )
  }
}
