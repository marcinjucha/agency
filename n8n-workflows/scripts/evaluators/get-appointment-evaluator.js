// =============================================================
// Get Appointment Handler — fetch appointment data
// =============================================================
// Reads resolvedConfig.appointmentIdExpression (pre-resolved by
// Orchestrator) or falls back to variableContext.appointmentId,
// fetches the appointment row from Supabase with tenant_id filter
// (security), and returns the 6 fields of the get_appointment
// output schema.
// =============================================================

const https = require('https');

const SUPABASE_URL = $env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error('SUPABASE_URL not configured');
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;

// @inline supabase-request
async function supabaseRequest(path, method, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  return new Promise((resolve, reject) => {
    const match = url.match(/^https?:\/\/([^/]+)(\/.*)$/);
    if (!match) { reject(new Error('Invalid SUPABASE_URL')); return; }
    const options = {
      hostname: match[1],
      path: match[2],
      method: method || 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Supabase ${method || 'GET'} ${path} ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          reject(new Error(`Parse error for ${path}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body !== undefined && body !== null) req.write(JSON.stringify(body));
    req.end();
  });
}
// @end-inline supabase-request

try {
  const item = $input.first().json;
  const { variableContext, tenantId } = item;

  // Resolve appointmentId: use resolvedConfig.appointmentIdExpression (pre-resolved by Orchestrator)
  // or fall back to variableContext.appointmentId for backward compat
  const appointmentId = item.resolvedConfig?.appointmentIdExpression ?? variableContext?.appointmentId;
  if (!appointmentId) throw new Error('get_appointment: appointmentIdExpression did not resolve to a valid ID');

  const safeTenantId = tenantId ?? '00000000-0000-0000-0000-000000000000';

  // Fetch appointment row with tenant_id filter (security)
  const appointments = await supabaseRequest(
    `appointments?id=eq.${appointmentId}&tenant_id=eq.${encodeURIComponent(safeTenantId)}&select=id,start_time,end_time,status,calendar_provider,calendar_event_id&limit=1`
  );
  if (!appointments.length) throw new Error(`Appointment ${appointmentId} not found for tenant ${safeTenantId}`);
  const appt = appointments[0];

  return {
    json: {
      ...item,
      stepResult: {
        success: true,
        outputPayload: {
          appointmentId: appt.id,
          appointmentStartTime: appt.start_time || null,
          appointmentEndTime: appt.end_time || null,
          appointmentStatus: appt.status || null,
          calendarProvider: appt.calendar_provider || null,
          calendarEventId: appt.calendar_event_id || null,
        },
      },
    }
  };
} catch (err) {
  const item = $input.first().json;
  return { json: { ...item, stepResult: { success: false, error: err.message } } };
}
