import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Absence',
  description: 'Report your absence quickly and easily.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Absence',
  },
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
