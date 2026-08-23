// Super-admin maintenance tools. Destructive, so each action needs a second tap to confirm
// (no blocking dialogs). Development/reset conveniences, admin-only.

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { destroyAllChores, resetAllCoins } from '@/lib/api';
import { Color, Ink, Radius } from '@/theme/tokens';

const DANGER = '#c8452f';

type Action = 'chores' | 'coins';

export function DangerZone({ token, onChanged }: { token: string | null; onChanged?: () => void }) {
  const [armed, setArmed] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(action: Action) {
    if (!token) return;
    if (armed !== action) {
      setArmed(action);
      setMsg(null);
      return;
    }
    setBusy(true);
    setArmed(null);
    setMsg(null);
    try {
      if (action === 'chores') {
        const { destroyed } = await destroyAllChores(token);
        setMsg(`Destroyed ${destroyed} chore${destroyed === 1 ? '' : 's'}.`);
      } else {
        const { removed_transactions } = await resetAllCoins(token);
        setMsg(`Reset coins — removed ${removed_transactions} ledger entr${removed_transactions === 1 ? 'y' : 'ies'}.`);
      }
      onChanged?.();
    } catch {
      setMsg('That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 10, padding: 16, borderColor: '#f0c8bf' }}>
      <AppText size={15} weight={800} color={DANGER}>
        Super admin
      </AppText>
      <AppText size={12} weight={600} color={Ink.t55}>
        These wipe data for the whole family. Tap twice to confirm.
      </AppText>

      <DangerButton
        label={armed === 'chores' ? 'Tap again to destroy all chores' : 'Destroy all chores'}
        armed={armed === 'chores'}
        busy={busy}
        onPress={() => run('chores')}
      />
      <DangerButton
        label={armed === 'coins' ? 'Tap again to reset all coins' : 'Reset all coins to zero'}
        armed={armed === 'coins'}
        busy={busy}
        onPress={() => run('coins')}
      />

      {msg ? (
        <AppText size={12} weight={700} color={Ink.t60}>
          {msg}
        </AppText>
      ) : null}
    </Card>
  );
}

function DangerButton({
  label,
  armed,
  busy,
  onPress,
}: {
  label: string;
  armed: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={{
        borderRadius: Radius.row,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: DANGER,
        backgroundColor: armed ? DANGER : Color.card,
        opacity: busy ? 0.6 : 1,
      }}>
      <AppText size={14} weight={800} color={armed ? Color.white : DANGER}>
        {label}
      </AppText>
    </Pressable>
  );
}
