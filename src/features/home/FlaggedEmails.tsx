import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { EmailRow } from '../../components/ui/EmailRow'
import { Card } from '../../components/ui/Card'
import { DEMO_EMAILS } from '../../lib/demo'
import type { DemoFlaggedEmail } from '../../types'

const COLLAPSED_COUNT = 3

interface FlaggedEmailsProps {
  emails?: DemoFlaggedEmail[]
}

export function FlaggedEmails({ emails = DEMO_EMAILS }: FlaggedEmailsProps) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const visible = expanded ? emails : emails.slice(0, COLLAPSED_COUNT)
  const hiddenCount = emails.length - COLLAPSED_COUNT

  return (
    <section className="mb-8">
      <SectionHeader
        label="Flagged Emails"
        count={emails.length}
        action={{ label: 'Open inbox', onClick: () => navigate('/inbox') }}
      />
      <Card padding="none">
        <div className="px-4">
          {emails.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No flagged emails</p>
          ) : (
            <>
              {visible.map((email) => (
                <EmailRow
                  key={email.id}
                  title={email.title}
                  domain={email.domain}
                  preview={email.preview}
                  timestamp={email.timestamp}
                  tag={email.tag}
                  memberName={email.memberName}
                />
              ))}
              {hiddenCount > 0 && !expanded && (
                <button
                  className="w-full text-xs text-slate-400 hover:text-slate-600 py-3 text-center"
                  onClick={() => setExpanded(true)}
                >
                  Show {hiddenCount} more ↓
                </button>
              )}
            </>
          )}
        </div>
      </Card>
    </section>
  )
}
