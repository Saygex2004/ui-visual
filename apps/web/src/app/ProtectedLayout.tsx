// The authenticated layout: renders the blocking forced-password-change
// screen while must_change_password is set (API_CONTRACT.md §2), otherwise
// the app shell around the matched child route.
import { Outlet } from '@tanstack/react-router';
import { useMe } from '../features/auth/hooks.js';
import { ForcedPasswordChange } from '../features/auth/ForcedPasswordChange.js';
import { Shell } from './Shell.js';

export function ProtectedLayout() {
  const { data } = useMe();
  if (!data) return null; // beforeLoad already resolved this; guards a render race only.

  if (data.user.must_change_password) {
    return <ForcedPasswordChange />;
  }

  return (
    <Shell user={data.user}>
      <Outlet />
    </Shell>
  );
}
