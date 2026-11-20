'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type State = 'loading' | 'unsupported' | 'install-first' | 'blocked' | 'off' | 'on' | 'busy'

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
function installed() {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

async function current(): Promise<State> {
  if (!('serviceWorker' in navigator)) return 'unsupported'
  if (!('PushManager' in window) || !('Notification' in window)) return isIos() && !installed() ? 'install-first' : 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

/** Turn phone notifications on (asks the phone's permission) and save this phone for the signed-in person. */
export async function turnOn(): Promise<State> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }))
  const j = sub.toJSON()
  const { error } = await createClient().rpc('save_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: j.keys!.p256dh, p_auth: j.keys!.auth })
  if (error) {
    await sub.unsubscribe()
    throw new Error(error.message)
  }
  return 'on'
}

/** Stop notifications on this phone (also used on sign-out). */
export async function turnOff() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await createClient().rpc('remove_push_subscription', { p_endpoint: sub.endpoint }).then(() => {}, () => {})
    await sub.unsubscribe()
  } catch {}
}

const COPY: Record<Exclude<State, 'loading' | 'busy'>, string> = {
  unsupported: 'This browser can’t show notifications. You’ll still see everything in the bell.',
  'install-first': 'On iPhone, add Bintang Class to your Home Screen first (Share, then Add to Home Screen), then open it from there and turn this on.',
  blocked: 'Notifications are blocked for this app in your phone’s settings. Allow them there, then come back.',
  off: 'Get a notification on this phone when something new arrives, even when the app is closed.',
  on: 'This phone gets a notification when something new arrives.',
}

/** The on/off card on the notifications page. */
export function PushToggle() {
  const [state, setState] = useState<State>('loading')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    current().then(setState, () => setState('unsupported'))
  }, [])
  if (state === 'loading') return null
  const shown = state === 'busy' ? 'off' : state
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Phone notifications {state === 'on' ? <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">On</span> : null}</p>
        <p className="mt-0.5 text-sm text-muted">{COPY[shown]}</p>
        {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
      </div>
      {state === 'off' || state === 'busy' ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={state === 'busy'}
          onClick={async () => {
            setError(null)
            setState('busy')
            try {
              setState(await turnOn())
            } catch {
              setError('Couldn’t turn on notifications. Try again.')
              setState('off')
            }
          }}
        >
          {state === 'busy' ? 'Turning on…' : 'Turn on'}
        </button>
      ) : state === 'on' ? (
        <button type="button" className="btn btn-quiet" onClick={async () => { await turnOff(); setState('off') }}>
          Turn off
        </button>
      ) : null}
    </div>
  )
}

const DISMISS = 'bc-push-asked'

/** A one-time card on the home page inviting people to turn notifications on. */
export function PushPrompt({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let asked = false
    try {
      asked = localStorage.getItem(DISMISS) === '1'
    } catch {}
    if (asked || navigator.webdriver) return
    current().then((s) => setShow(s === 'off'), () => {})
  }, [])
  if (!show) return null
  const hide = () => {
    try {
      localStorage.setItem(DISMISS, '1')
    } catch {}
    setShow(false)
  }
  return (
    <div className="panel flex items-start gap-4 p-5" role="region" aria-label="Notifications">
      <span className="tile-icon shrink-0 bg-brass-soft text-brass-ink">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2.2 2.2 0 0 0 4 0" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Get notified on this phone</p>
        <p className="mt-0.5 text-sm text-muted">{text}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn btn-primary min-h-10"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await turnOn()
              } catch {}
              hide()
            }}
          >
            {busy ? 'Turning on…' : 'Turn on'}
          </button>
          <button type="button" className="btn btn-quiet min-h-10" onClick={hide}>Not now</button>
        </div>
      </div>
    </div>
  )
}
