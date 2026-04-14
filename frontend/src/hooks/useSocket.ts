import { useEffect } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'

export interface IncidentEvent {
  type: string
  incidentId: string
  ticketNumber: string
  payload: Record<string, unknown>
  actorEmail: string
  timestamp: string
}

export function useSocketConnection() {
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      connectSocket(token)
    }
    return () => {
      disconnectSocket()
    }
  }, [])
}

export function useIncidentRoom(
  incidentId: string | undefined,
  onEvent: (event: IncidentEvent) => void,
) {
  useEffect(() => {
    if (!incidentId) return
    const s = getSocket()
    s.emit('join_incident', { incidentId })
    s.on('incident_event', onEvent)
    return () => {
      s.emit('leave_incident', { incidentId })
      s.off('incident_event', onEvent)
    }
  }, [incidentId, onEvent])
}

export function useIncidentListUpdates(onUpdate: (event: IncidentEvent) => void) {
  useEffect(() => {
    const s = getSocket()
    s.on('incident_list_update', onUpdate)
    return () => {
      s.off('incident_list_update', onUpdate)
    }
  }, [onUpdate])
}
