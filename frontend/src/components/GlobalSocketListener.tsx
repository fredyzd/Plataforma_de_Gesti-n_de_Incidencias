import { useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { connectSocket, disconnectSocket } from '../lib/socket'
import { useIncidentListUpdates, type IncidentEvent } from '../hooks/useSocket'
import { useToast } from './ui/Toast'

const EVENT_MESSAGES: Record<string, string> = {
  'incident.created': 'Nueva incidencia creada',
  'incident.status_changed': 'Estado de incidencia actualizado',
  'incident.assigned': 'Incidencia asignada',
  'incident.comment_added': 'Nuevo comentario en incidencia',
}

export function GlobalSocketListener() {
  const { user } = useAuth()
  const { show } = useToast()

  // Connect when user is authenticated
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('access_token')
    if (token) connectSocket(token)
    return () => { disconnectSocket() }
  }, [user])

  const handleUpdate = useCallback((event: IncidentEvent) => {
    const msg = EVENT_MESSAGES[event.type]
    if (msg) {
      show(`${msg}: ${event.ticketNumber}`, 'info')
    }
  }, [show])

  useIncidentListUpdates(handleUpdate)

  return null
}
