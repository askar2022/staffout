import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has an org
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.organization_id) {
      return NextResponse.json({ error: 'Already set up' }, { status: 400 })
    }

    const slug = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        slug: `${slug}-${Date.now()}`,
        contact_email: body.contact_email || user.email,
        reply_to_email: body.contact_email || user.email,
      })
      .select()
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Link user to org
    await supabase
      .from('profiles')
      .update({ organization_id: org.id, full_name: body.admin_name })
      .eq('id', user.id)

    // Add default admin recipient
    await supabase.from('notification_recipients').insert({
      organization_id: org.id,
      name: body.admin_name || 'Administrator',
      email: user.email!,
      type: 'admin',
      receives_summary: true,
      receives_instant: true,
    })

    return NextResponse.json({ success: true, org_id: org.id })
  } catch (err) {
    console.error('Setup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
