import { createTables } from '@/lib/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await createTables();
    return NextResponse.json({ message: 'Database tables created successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error creating database tables:', error);
    return NextResponse.json({ error: 'Failed to create database tables.' }, { status: 500 });
  }
}
