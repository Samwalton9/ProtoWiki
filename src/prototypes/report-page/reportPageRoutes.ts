import { cdxIconFlag } from '@wikimedia/codex-icons'

import { registerPersonalTools } from '@/components/chrome/personalTools'

export const REPORT_PAGE_PATH = '/report-page'
export const ADMIN_REQUESTS_PATH = '/report-page/admin-requests'

/** Add "Admin requests" to the personal tools menu. Call in `<script setup>`. */
export function registerAdminRequestsTool(): void {
  registerPersonalTools([
    { id: 'admin-requests', label: 'Admin requests', icon: cdxIconFlag, path: ADMIN_REQUESTS_PATH },
  ])
}
