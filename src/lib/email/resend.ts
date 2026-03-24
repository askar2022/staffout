import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailOptions {
  to: string[]
  subject: string
  html: string
  text: string
  replyTo?: string
  from?: string
}

export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, text, replyTo, from } = options

  try {
    const result = await resend.emails.send({
      from: from || 'StaffOut <notifications@staffout.app>',
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
