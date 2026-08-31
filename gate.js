/* One way to record a decision at the gate.

   Four screens can approve or turn back a student — the confirmation after a scan, the list of
   who is expected out, the message alert, and the student's own card — and they had drifted:
   some forwarded the slip's reason and destination, others dropped them, so the same act was
   logged differently depending on which screen the officer happened to be standing in. The
   payload is built here once instead.

   A decision is only reported as done once the server echoes back the row it wrote, so a
   movement that never reached the database cannot look like one that did. */

import { schoolApi, ApiError } from './api';

/**
 * @param permission the slip being answered, when there is one. Its id is sent so the server
 *   closes that exact permission rather than guessing at the newest open one.
 */
export async function decideGatePass({
  code,
  direction = 'out',
  decision,
  permission = null,
  authorisedBy = '',
  reason = '',
  destination = '',
  note = '',
  recordedBy = '',
}) {
  const res = await schoolApi.recordGatePass({
    code,
    direction,
    decision,
    // The slip is the authority when one exists; the typed-in name is the fallback for a
    // student leaving without one.
    authorisedBy: (permission && permission.granted_by) || authorisedBy,
    reason: (permission && permission.reason) || reason,
    destination: (permission && permission.destination) || destination,
    note,
    recordedBy,
    permissionId: (permission && permission.id) || undefined,
  });

  if (!res || !res.pass || res.pass.decision !== decision) {
    throw new ApiError('The server did not confirm the movement. Nothing was recorded.', 0);
  }
  return res;
}

/** What went wrong, in words the person at the gate can act on. */
export const gateFailureText = (err) =>
  (err && err.status === 404
    ? 'This server has no gate endpoint. It is running an older build than this app.'
    : (err && err.message) || 'Not recorded.');
