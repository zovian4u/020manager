import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const overwrite = searchParams.get('overwrite') === 'true';

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && secret !== 'manual') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: members, error: fetchError } = await supabaseAdmin
            .from('members')
            .select('user_id, total_hero_power, squad_1_power, arena_power')
            .not('user_id', 'is', null);

        if (fetchError) throw fetchError;
        if (!members || members.length === 0) return NextResponse.json({ message: 'No members found' });

        const date = new Date();
        const weekLabel = `W${getWeekNumber(date)}-${date.getFullYear()}`;

        const uniqueSnapshots = new Map();
        members.forEach(member => {
            if (!uniqueSnapshots.has(member.user_id)) {
                uniqueSnapshots.set(member.user_id, {
                    user_id: member.user_id,
                    total_hero_power: member.total_hero_power || 0,
                    squad_1_power: member.squad_1_power || 0,
                    arena_power: member.arena_power || 0,
                    week_label: weekLabel,
                    captured_at: date.toISOString()
                });
            }
        });

        const snapshotsToUpsert = Array.from(uniqueSnapshots.values());

        const { error: upsertError } = await supabaseAdmin
            .from('growth_snapshots')
            .upsert(snapshotsToUpsert, { 
                onConflict: 'user_id,week_label',
                ignoreDuplicates: !overwrite 
            });

        if (upsertError) {
            return NextResponse.json({ 
                error: 'Database Op Failed', 
                details: upsertError.message 
            }, { status: 500 });
        }

        return NextResponse.json({
            message: `Successfully processed ${snapshotsToUpsert.length} unique members`,
            action: overwrite ? 'UPDATED_EXISTING' : 'INSERTED_NEW',
            week: weekLabel
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}
