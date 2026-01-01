import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { VOID } from '../theme/colors';

const Orb = ({
  size = 60,
  color = VOID.orb.primary,
  glowColor,
  intensity = 1,
  pulse = false,
  children,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.9,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulse]);

  const glow = glowColor || color + '66';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: pulse ? pulseAnim : 1 }],
        },
        style,
      ]}
    >
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size * 0.8,
            backgroundColor: glow,
            opacity: Animated.multiply(glowAnim, intensity * 0.5),
          },
        ]}
      />
      {/* Inner glow */}
      <View
        style={[
          styles.innerGlow,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size * 0.6,
            backgroundColor: glow,
            opacity: intensity * 0.4,
          },
        ]}
      />
      {/* Main orb */}
      <View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      >
        {/* Highlight for 3D effect */}
        <View
          style={[
            styles.highlight,
            {
              width: size * 0.4,
              height: size * 0.25,
              borderRadius: size * 0.2,
              top: size * 0.12,
              left: size * 0.15,
            },
          ]}
        />
        {/* Secondary highlight */}
        <View
          style={[
            styles.secondaryHighlight,
            {
              width: size * 0.15,
              height: size * 0.1,
              borderRadius: size * 0.1,
              top: size * 0.42,
              left: size * 0.18,
            },
          ]}
        />
        {/* Content */}
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
  },
  innerGlow: {
    position: 'absolute',
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  secondaryHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Orb;
