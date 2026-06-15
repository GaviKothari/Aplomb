import { EngineerLayout } from '@/components/layout/engineer-layout'

export const metadata = { title: 'APLOMB Field App' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <EngineerLayout>{children}</EngineerLayout>
}
