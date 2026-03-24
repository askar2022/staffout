import { Resend } from 'resend'

export interface SendEmailOptions {
  to: string[]
  subject: string
  html: string
  text: string
  replyTo?: string
  from?: string
}

export async function sendEmail(options: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set — email not sent')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  // Lazy init — only created when sendEmail is actually called, not at build time
  const resend = new Resend(apiKey)
  const { to, subject, html, text, replyTo, from } = options

  const fromAddress =
    process.env.RESEND_FROM_EMAIL
      ? `StaffOut <${process.env.RESEND_FROM_EMAIL}>`
      : 'StaffOut <notifications@staffout.app>'

  try {
    const result = await resend.emails.send({
      from: from || fromAddress,
      to,
      subject,
      html,
      text,
      replyTo,
    })
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: String(error) }
  }
}
