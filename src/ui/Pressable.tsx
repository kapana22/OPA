import React from 'react';
import { Pressable as RNPressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/**
 * დაჭერაზე ოდნავ ჩაწოლილი ღილაკი.
 *
 * პორტი: `PressStyle` (`Splash/Components/Buttons.swift`) — იგივე 0.965
 * მასშტაბი და იგივე spring.
 */
export function Pressable({
  style,
  children,
  disabled,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.035, { damping: 14, stiffness: 220 }) }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = 1;
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = 0;
        rest.onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
