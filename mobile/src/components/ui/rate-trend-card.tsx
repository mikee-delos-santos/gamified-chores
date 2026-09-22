// The weekly exchange-rate forecast (PC-82). Seven predetermined coin -> peso rates for the
// week, drawn as a small line so a kid can see which day pays best and choose to wait for it.
// Rates run 0.1 .. 5.0; the y-axis is fixed to 0 .. 5 so "how good is today" reads at a glance.

import { Fragment, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import type { RateWeek } from '@/lib/api';
import { Color, Ink } from '@/theme/tokens';

const MAX_RATE = 5;
const PAD = { left: 16, right: 16, top: 20, bottom: 24 };
const PLOT_HEIGHT = 96;

export function RateTrendCard({ week }: { week: RateWeek | null }) {
  const [width, setWidth] = useState(0);

  const days = week?.days ?? [];
  if (days.length === 0) return null;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const svgHeight = PLOT_HEIGHT + PAD.top + PAD.bottom;
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const peak = Math.max(...days.map((d) => d.peso_per_coin));

  const x = (i: number) => PAD.left + (days.length > 1 ? (plotWidth * i) / (days.length - 1) : 0);
  const y = (v: number) => PAD.top + PLOT_HEIGHT * (1 - Math.min(v, MAX_RATE) / MAX_RATE);

  const linePoints = days.map((d, i) => `${x(i)},${y(d.peso_per_coin)}`).join(' ');

  const today = days.find((d) => d.is_today);
  const live = week?.peso_per_coin;

  return (
    <Card onLayout={onLayout}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <AppText size={16} weight={800} color={Color.navy}>
          This week&apos;s coin rate
        </AppText>
        {live != null ? (
          <AppText size={13} weight={700} color={Ink.t60} tabular>
            Today ₱{live.toFixed(2)}
          </AppText>
        ) : null}
      </View>

      <AppText size={12} weight={600} color={Ink.t55} style={{ marginTop: 2 }}>
        {today
          ? `Best day this week pays ₱${peak.toFixed(1)} - wait for it!`
          : `Highest this week: ₱${peak.toFixed(1)}`}
      </AppText>

      {width > 0 ? (
        <Svg width={width} height={svgHeight} style={{ marginTop: 8 }}>
          {/* baseline */}
          <Line
            x1={PAD.left}
            y1={y(0)}
            x2={width - PAD.right}
            y2={y(0)}
            stroke={Color.softBlue}
            strokeWidth={1}
          />
          {/* the trend line */}
          <Polyline
            points={linePoints}
            fill="none"
            stroke={Color.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {days.map((d, i) => {
            const isPeak = d.peso_per_coin === peak;
            const dotColor = d.is_today
              ? Color.primary
              : d.is_past
                ? Color.softBlueBorder
                : Color.primaryHover;
            return (
              <Fragment key={d.date}>
                {isPeak ? (
                  <Circle cx={x(i)} cy={y(d.peso_per_coin)} r={7} fill={Color.coinChip} stroke={Color.coinGold} strokeWidth={2} />
                ) : null}
                <Circle
                  cx={x(i)}
                  cy={y(d.peso_per_coin)}
                  r={d.is_today ? 5 : 3.5}
                  fill={dotColor}
                  stroke={Color.white}
                  strokeWidth={d.is_today ? 2 : 1}
                />
                {/* value above the point */}
                <SvgText
                  x={x(i)}
                  y={y(d.peso_per_coin) - 10}
                  fontSize={10}
                  fontWeight={d.is_today || isPeak ? '800' : '600'}
                  fill={d.is_today ? Color.primary : Ink.t60}
                  textAnchor="middle">
                  {d.peso_per_coin.toFixed(1)}
                </SvgText>
                {/* weekday below the baseline */}
                <SvgText
                  x={x(i)}
                  y={svgHeight - 8}
                  fontSize={11}
                  fontWeight={d.is_today ? '800' : '600'}
                  fill={d.is_today ? Color.navy : Ink.t55}
                  textAnchor="middle">
                  {d.weekday}
                </SvgText>
              </Fragment>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height: svgHeight + 8 }} />
      )}
    </Card>
  );
}
