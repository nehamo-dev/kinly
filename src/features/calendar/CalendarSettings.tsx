import { useEffect, useState } from 'react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { buildGoogleAuthUrl, disconnectCalendar } from '../../lib/google'
import { useAuthStore } from '../../store/authStore'
import type { GoogleConnection } from '../../types'

export function CalendarSettings() {
  const familyId = useAuthStore((s) => s.familyId)
  const user = useAuthStore((s) => s.user)
  const [connection, setConnection] = useState<GoogleConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  async function loadConnection() {
    if (!familyId || !user) return
    const { data } = await supabase
      .from('google_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .single()
    setConnection(data)
    setLoading(false)
  }

  useEffect(() => { loadConnection() }, [familyId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDisconnect() {
    if (!familyId || !user) return
    setDisconnecting(true)
    try {
      await disconnectCalendar(familyId, user.id)
      setConnection(null)
    } finally {
      setDisconnecting(false)
    }
  }

  function handleConnect() {
    window.location.href = buildGoogleAuthUrl('settings')
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your Kinly account and integrations</p>
      </div>

      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <CalendarIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Google Calendar</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? '…' : connection?.calendar_connected
                  ? 'Connected — syncing events automatically'
                  : 'Not connected'}
              </p>
            </div>
          </div>

          {!loading && (
            connection?.calendar_connected ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                loading={disconnecting}
              >
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                Connect
              </Button>
            )
          )}
        </div>
      </Card>

      {connection?.calendar_connected && (
        <Card>
          <p className="text-sm font-medium text-slate-700 mb-1">Sync status</p>
          <p className="text-xs text-slate-400">
            Kinly syncs the next 14 days of events on every page load.
            Calendar events are matched to family members by name.
          </p>
        </Card>
      )}
    </PageWrapper>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  )
}
