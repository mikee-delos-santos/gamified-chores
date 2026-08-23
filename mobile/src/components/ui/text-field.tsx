// Text input in the kid/admin design system: soft input fill, 2px soft-blue border that turns
// primary on focus, 16px radius, Nunito. Used across the admin forms and the coin bank later.

import { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { Color, Font, Radius } from '@/theme/tokens';

export function TextField({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor="rgba(27,43,58,0.4)"
      style={[
        {
          backgroundColor: Color.inputFill,
          borderWidth: 2,
          borderColor: focused ? Color.primary : Color.softBlue,
          borderRadius: Radius.input,
          paddingVertical: 13,
          paddingHorizontal: 14,
          fontSize: 17,
          fontFamily: Font[700],
          color: Color.navy,
        },
        style,
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
}
