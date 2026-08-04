import { createFileRoute } from '@tanstack/react-router'
import { runReminderCron } from '#/features/expenses/reminders.server'

export const Route = createFileRoute('/api/cron/reminders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET
        if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
          return Response.json({ ok: false }, { status: 401 })
        }
        try {
          return Response.json(await runReminderCron())
        } catch (error) {
          console.error('Reminder cron failed', error)
          return Response.json({ ok: false }, { status: 500 })
        }
      },
    },
  },
})
