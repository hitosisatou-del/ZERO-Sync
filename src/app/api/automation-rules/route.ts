import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';

export async function GET() {
  try {
    const rules = await DBService.getAutomationRules();
    return NextResponse.json({ rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const rule = await DBService.createAutomationRule(data);
    return NextResponse.json({ rule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID is required');
    await DBService.deleteAutomationRule(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
