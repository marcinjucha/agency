

import { CalendarConnectionList } from './CalendarConnectionList'

/**
 * Main calendar settings component.
 *
 * Renders the multi-provider connection manager (CalendarConnectionList).
 * The booking settings form (CalendarSettingsForm) is rendered separately
 * by the settings page layout.
 */
export function CalendarSettings() {
  return <CalendarConnectionList />
}
