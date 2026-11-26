import type { Role } from '../mock/types';
import type { Section } from './screens';

/** Which sidebar sections each role can open. The admission desk sees only the Queue. */
export function canSee(role: Role, section: Section) {
  if (section === 'access') return true;
  if (role === 'desk') return section === 'queue';
  // D21 Approvals only when the manager is also the senior nurse.
  if (section === 'approvals') return role === 'manager-senior';
  return true;
}
