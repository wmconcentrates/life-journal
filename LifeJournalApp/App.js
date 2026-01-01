import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CoachScreen from './src/screens/CoachScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import WeeklySummaryScreen from './src/screens/WeeklySummaryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Void theme colors
const VOID = {
  deep: '#050508',
  dark: '#0A0A0F',
  surface: '#12121A',
  elevated: '#1A1A24',
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#EC4899',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.08)',
};

const Tab = createBottomTabNavigator();

// Animated orb-style tab icon
const TabIcon = ({ icon, focused, color }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.2 : 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={styles.tabIconContainer}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.tabGlow,
          {
            opacity: glowAnim,
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      {/* Icon */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.5 }]}>{icon}</Text>
      </Animated.View>
    </View>
  );
};

const TabLabel = ({ label, focused, color }) => (
  <Text
    style={[
      styles.tabLabel,
      {
        color: focused ? color : VOID.textMuted,
        fontWeight: focused ? '600' : '400',
      },
    ]}
  >
    {label}
  </Text>
);

const App = () => {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: VOID.primary,
          background: VOID.deep,
          card: VOID.surface,
          text: VOID.text,
          border: VOID.border,
          notification: VOID.accent,
        },
      }}
    >
      <StatusBar style="light" />
      <Tab.Navigator
        initialRouteName="Coach"
        screenOptions={{
          tabBarStyle: {
            backgroundColor: VOID.surface,
            borderTopColor: VOID.border,
            borderTopWidth: 1,
            paddingTop: 12,
            paddingBottom: 12,
            height: 75,
            shadowColor: VOID.primary,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 20,
          },
          tabBarActiveTintColor: VOID.primary,
          tabBarInactiveTintColor: VOID.textMuted,
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Coach"
          component={CoachScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="🧘" focused={focused} color={VOID.primary} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Coach" focused={focused} color={VOID.primary} />
            ),
          }}
        />
        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="📅" focused={focused} color={VOID.secondary} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Timeline" focused={focused} color={VOID.secondary} />
            ),
          }}
        />
        <Tab.Screen
          name="Summary"
          component={WeeklySummaryScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="📊" focused={focused} color={VOID.accent} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Summary" focused={focused} color={VOID.accent} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="⚙️" focused={focused} color="#06B6D4" />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Settings" focused={focused} color="#06B6D4" />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 30,
  },
  tabGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
  },
  tabIcon: {
    fontSize: 24,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.3,
  },
});

export default App;
