import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import {
  CashOutRequest,
  ChildProfile,
  approveCashOut,
  denyCashOut,
  getFamilySettings,
  listCashOutRequests,
  listChildProfiles,
  updateFamilySettings,
} from '@/lib/api';
import { fmtCoins, fmtPeso } from '@/lib/format';
import { useSession } from '@/lib/session';
import { Color, Ink, Radius } from '@/theme/tokens';

function fmtPesoAmount(peso: number): string {
  return `₱${(Number.isFinite(peso) ? peso : 0).toFixed(2)}`;
}

export default function AdminBank() {
  const { token } = useSession();

  const [rate, setRate] = useState('');
  const [pesoPerCoin, setPesoPerCoin] = useState(0);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [requests, setRequests] = useState<CashOutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingRate, setSavingRate] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [scrollNode, setScrollNode] = useState<HTMLElement | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [settings, kids, pending] = await Promise.all([
        getFamilySettings(token),
        listChildProfiles(),
        listCashOutRequests(token, 'pending'),
      ]);
      setRate(String(settings.peso_per_coin));
      setPesoPerCoin(settings.peso_per_coin);
      setChildren([...kids].sort((a, b) => b.balance - a.balance));
      setRequests(pending);
    } catch {
      setError('Could not load the coin bank.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const listRef = useCallback((r: FlatList<CashOutRequest> | null) => {
    setScrollNode((r as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.() ?? null);
  }, []);

  useWebPullToRefresh(scrollNode, onRefresh);

  async function onSaveRate() {
    if (!token) return;
    const value = Number(rate);
    setRateMsg(null);
    if (!Number.isFinite(value) || value <= 0) {
      setRateMsg('Enter a rate greater than 0.');
      return;
    }
    setSavingRate(true);
    try {
      const saved = await updateFamilySettings(token, value);
      setRate(String(saved.peso_per_coin));
      setPesoPerCoin(saved.peso_per_coin);
      setRateMsg('Saved.');
    } catch {
      setRateMsg('Could not save the rate.');
    } finally {
      setSavingRate(false);
    }
  }

  async function decide(req: CashOutRequest, approve: boolean) {
    if (!token) return;
    setActingId(req.id);
    try {
      if (approve) await approveCashOut(token, req.id);
      else await denyCashOut(token, req.id);
      setRequests((rs) => rs.filter((r) => r.id !== req.id));
    } catch {
      setError('Could not update that request.');
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={Color.primary} style={{ marginTop: 48 }} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList<CashOutRequest>
        ref={listRef}
        data={requests}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Color.primary} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {Platform.OS === 'web' && refreshing ? (
              <ActivityIndicator color={Color.primary} style={{ marginTop: 8 }} />
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 16 }}>
              <AppText size={24} weight={800} color={Color.navy}>
                Coin bank
              </AppText>
            </View>

            <Card style={{ padding: 16, marginBottom: 18, gap: 12 }}>
              <AppText size={16} weight={800} color={Color.navy}>
                Kids’ balances
              </AppText>
              {children.length === 0 ? (
                <AppText size={12} weight={700} color={Ink.t55}>
                  No kids yet.
                </AppText>
              ) : (
                children.map((child, i) => (
                  <View
                    key={child.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: i === 0 ? 0 : 10,
                      borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopColor: Color.keyPress,
                    }}>
                    <AppText size={15} weight={800} color={Color.navy}>
                      {child.name}
                    </AppText>
                    <View
                      style={{
                        backgroundColor: Color.coinChip,
                        borderRadius: Radius.chip,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                      }}>
                      <AppText size={14} weight={800} color={Color.navy} tabular>
                        {fmtCoins(child.balance)} coins · {fmtPeso(child.balance, pesoPerCoin)}
                      </AppText>
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Card style={{ gap: 10, padding: 16, marginBottom: 18 }}>
              <AppText size={16} weight={800} color={Color.navy}>
                Coin → peso rate
              </AppText>
              <AppText size={12} weight={700} color={Ink.t55}>
                What one coin is worth in pesos. Shown to kids only in their coin bank.
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText size={15} weight={800} color={Color.navy}>
                  1 coin = ₱
                </AppText>
                <TextField
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="decimal-pad"
                  placeholder="2.50"
                  style={{ flex: 1 }}
                />
              </View>
              <PrimaryButton label={savingRate ? 'Saving…' : 'Save rate'} onPress={savingRate ? undefined : onSaveRate} />
              {rateMsg ? (
                <AppText size={12} weight={700} color={Ink.t60}>
                  {rateMsg}
                </AppText>
              ) : null}
            </Card>

            <AppText size={18} weight={800} color={Color.navy} style={{ marginBottom: 10 }}>
              Cash-outs to approve
            </AppText>

            {error ? (
              <AppText size={13} weight={700} color={Color.primary} style={{ marginBottom: 10 }}>
                {error}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
            <AppText size={14} weight={800} color={Color.navy}>
              Nothing waiting
            </AppText>
            <AppText size={12} weight={700} color={Ink.t55} center style={{ marginTop: 4 }}>
              When a kid asks to cash out, it shows up here.
            </AppText>
          </Card>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Card style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText size={16} weight={800} color={Color.navy}>
                {item.child_name}
              </AppText>
              <View
                style={{
                  backgroundColor: Color.coinChip,
                  borderRadius: Radius.chip,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                }}>
                <AppText size={14} weight={800} color={Color.navy} tabular>
                  {fmtCoins(item.coins)} coins · {fmtPesoAmount(item.peso_amount)}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SecondaryButton
                label={actingId === item.id ? '…' : 'Deny'}
                onPress={actingId === item.id ? undefined : () => decide(item, false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={actingId === item.id ? '…' : 'Approve'}
                onPress={actingId === item.id ? undefined : () => decide(item, true)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
