import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('visitors')
      .select('*')
      .order('check_in_time', { ascending: false });

    if (from) {
      query = query.gte('check_in_time', `${from}T00:00:00.000Z`);
    }
    if (to) {
      query = query.lte('check_in_time', `${to}T23:59:59.999Z`);
    }

    const { data: visitors, error } = await query;
    if (error) throw error;

    const headers = [
      'Pass ID',
      'Full Name',
      'Mobile',
      'Email',
      'Company',
      'Purpose',
      'Who to Meet',
      'Department',
      'Title',
      'Visitors',
      'Check In',
      'Check Out',
      'Status',
    ];

    const escapeCSV = (val: any) => {
      const str = val == null ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = (visitors || []).map((v) =>
      [
        v.pass_id,
        v.full_name,
        v.mobile,
        v.email || '',
        v.company || '',
        v.purpose || '',
        v.who_to_meet || '',
        v.host_department || '',
        v.host_title || '',
        v.number_of_visitors || 1,
        v.check_in_time,
        v.check_out_time || '',
        v.status,
      ]
        .map(escapeCSV)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\r\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="visitors.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
