import React from 'react';
import { Pressable as RNPressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Controls } from '../theme/theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/**
 * დაჭერაზე ოდნავ ჩაწოლილი ღილაკი.
 *
 * საერთო რბილი უკუკავშირი ყველა კონტროლზე.
 */
export function Pressable({
  style,
  children,
  disabled,
  animate = true,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; children: React.ReactNode; animate?: boolean }) {
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(animate && !disabled ? 1 - pressed.value * (1 - Controls.pressedScale) : 1, { damping: 18, stiffness: 260 }) }],
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
