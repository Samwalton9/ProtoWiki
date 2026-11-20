import { cdxIconEdit, cdxIconEye, type Icon } from '@wikimedia/codex-icons'

import type { RequestSignal } from './adminRequests'

/** Chip label, hover text and icon for each page signal. */
export const REQUEST_SIGNALS: Record<RequestSignal, { label: string; title: string; icon: Icon }> =
  {
    'high-activity': {
      label: 'High activity',
      title: 'The page is being edited rapidly.',
      icon: cdxIconEdit,
    },
    'high-pageviews': {
      label: 'High pageviews',
      title: 'The page has a large number of pageviews.',
      icon: cdxIconEye,
    },
  }
