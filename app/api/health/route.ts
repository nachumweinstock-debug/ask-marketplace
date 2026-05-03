export async function GET() {
  return Response.json({
    status: 'ok',
    database: 'checked by Railway API health endpoint',
    storage: 'checked by Railway API health endpoint',
    env: {
      required: ['JWT_SECRET'],
      optional: ['FRONTEND_URL', 'EMAIL_HOST', 'RESEND_API_KEY', 'POSTHOG_API_KEY'],
    },
    uptime: 'available from /api/health on the API service',
  })
}
