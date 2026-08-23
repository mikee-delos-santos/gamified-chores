import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CoinIcon } from '@/components/ui/coin-icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import { CoinBank, CoinBankEntry, getCoinBank, requestCashOut } from '@/lib/api';
import { getBoundKid } from '@/lib/device-session';
import { fmtCoins } from '@/lib/format';
import { Color, Ink, Radius } from '@/theme/tokens';

function fmtPesoAmount(peso: number): string {
  return `₱${(Number.isFinite(peso) ? peso : 0).toFixed(2)}`;
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function KidBank() {
  const router = useRouter();

  const [childId, setChildId] = useState<number | null>(null);
  const [bank, setBank] = useState<CoinBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [scrollNode, setScrollNode] = useState<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const bound = await getBoundKid();
      if (!bound) {
        router.replace('/');
        return;
      }
      setChildId(bound.id);
      setBank(await getCoinBank(bound.id));
    } catch {
      setError('Could not open the coin bank.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const listRef = useCallback((r: FlatList<CoinBankEntry> | null) => {
    setScrollNode((r as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.() ?? null);
  }, []);

  useWebPullToRefresh(scrollNode, onRefresh);

  async function onCashOut() {
    if (!bank || childId == null) return;
    const coins = Number(amount);
    setHint(null);
    if (!Number.isFinite(coins) || coins <= 0) {
      setHint('Type how many coins to cash out.');
      return;
    }
    if (coins > bank.balance) {
      setHint('Not enough coins to cash out yet.');
      return;
    }
    setBusy(true);
    try {
      const req = await requestCashOut(childId, coins);
      setAmount('');
      setHint(`Asked for ${fmtPesoAmount(req.peso_amount)}. Waiting for approval.`);
      await load();
    } catch {
      setHint('Could not send that. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={Color.primary} style={{ marginTop: 48 }} />
      </Screen>
    );
  }

  if (error || !bank) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <AppText size={15} weight={700} color={Color.ink}>
            {error ?? 'Not found.'}
          </AppText>
          <Pressable onPress={load}>
            <AppText size={15} weight={800} color={Color.primary}>
              Try again
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const pending = bank.pending_cash_out;

  return (
    <Screen padded={false}>
      <FlatList<CoinBankEntry>
        ref={listRef}
        data={bank.history}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Color.primary} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {Platform.OS === 'web' && refreshing ? (
              <ActivityIndicator color={Color.primary} style={{ marginTop: 8 }} />
            ) : null}

            {/* Header: title + rate (no back — this is a tab root) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                paddingBottom: 16,
              }}>
              <AppText size={24} weight={800} color={Color.navy}>
                Coin bank
              </AppText>
              <AppText size={12} weight={700} color={Ink.t55} tabular>
                1 coin = {fmtPesoAmount(bank.peso_per_coin)}
              </AppText>
            </View>

            {/* Balance + peso value (the only place peso appears) */}
            <Card style={{ padding: 18, gap: 6 }}>
              <AppText size={12} weight={700} color={Ink.t55}>
                Your coins
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CoinIcon size={34} />
                <AppText size={38} weight={900} color={Color.navy} tabular lineHeight={42}>
                  {fmtCoins(bank.balance)}
                </AppText>
              </View>
              <AppText size={14} weight={800} color={Color.primary} tabular>
                Worth {fmtPesoAmount(bank.peso_value)}
              </AppText>
            </Card>

            {/* Pending cash-out waiting state */}
            {pending ? (
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: Color.softBlue,
                  borderColor: Color.softBlueBorder,
                  borderWidth: 2,
                  borderRadius: Radius.card,
                  padding: 14,
                }}>
                <AppText size={14} weight={800} color={Color.navy}>
                  Asked for {fmtPesoAmount(pending.peso_amount)}. Waiting for approval.
                </AppText>
                <AppText size={12} weight={700} color={Ink.t55} style={{ marginTop: 2 }}>
                  {fmtCoins(pending.coins)} coins. A grown-up will say yes soon.
                </AppText>
              </View>
            ) : null}

            {/* Cash-out amount card */}
            <Card style={{ marginTop: 14, padding: 16, gap: 12 }}>
              <AppText size={15} weight={800} color={Color.navy}>
                How many coins?
              </AppText>
              <TextField
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                style={{ fontSize: 20 }}
              />
              <PrimaryButton label={busy ? 'Sending…' : 'Cash out'} onPress={busy ? undefined : onCashOut} />
              {hint ? (
                <AppText size={12} weight={700} color={Ink.t55}>
                  {hint}
                </AppText>
              ) : null}
            </Card>

            <AppText size={18} weight={800} color={Color.navy} style={{ marginTop: 22, marginBottom: 10 }}>
              Coin history
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
            <AppText size={14} weight={800} color={Color.navy}>
              No coins yet
            </AppText>
            <AppText size={12} weight={700} color={Ink.t55} center style={{ marginTop: 4 }}>
              Finish a chore and your coins show up here.
            </AppText>
          </Card>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Color.card,
              borderColor: Color.keyPress,
              borderWidth: 2,
              borderRadius: Radius.key,
              paddingVertical: 11,
              paddingHorizontal: 14,
              gap: 8,
            }}>
            <View style={{ flex: 1 }}>
              <AppText size={14} weight={800} color={Color.navy}>
                {item.label}
              </AppText>
              <AppText size={11} weight={700} color={Ink.t50}>
                {whenLabel(item.created_at)}
              </AppText>
            </View>
            <AppText
              size={16}
              weight={900}
              tabular
              color={item.amount < 0 ? Color.ink : Color.primary}>
              {item.amount < 0 ? '' : '+'}
              {fmtCoins(item.amount)}
            </AppText>
          </View>
        )}
      />
    </Screen>
  );
}
