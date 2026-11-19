import Link from 'next/link'
import { requireUser } from '@/lib/centre'
import { Logo } from '@/components/star'
import { CreateCentreForm } from './create-form'

export const metadata = { title: 'Set up a centre' }

export default async function NewCentrePage() {
  await requireUser()
  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <Link href="/app"><Logo /></Link>
      <h1 className="page-title mt-14">Set up your centre</h1>
      <p className="mt-2 text-muted">
        You’ll be the owner. Next you can add classes, students and invite your teachers.
      </p>
      <div className="mt-8">
        <CreateCentreForm />
      </div>
    </main>
  )
}
