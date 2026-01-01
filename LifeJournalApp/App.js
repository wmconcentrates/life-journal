import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CoachScreen from './src/screens/CoachScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import WeeklySummaryScreen from './src/screens/WeeklySummaryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// Animated Tab Icon with press feedback
const TabIcon = ({ icon, focused, color }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
    </Animated.View>
  );
};

// Custom Tab Bar Label
const TabLabel = ({ label, focused }) => (
  <Text
    style={{
      fontSize: 11,
      fontWeight: focused ? '600' : '400',
      color: focused ? '#8B7355' : '#A9A9A9',
      marginTop: 2,
    }}
  >
    {label}
  </Text>
);

const App = () => {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        initialRouteName="Coach"
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#FFFCF8',
            borderTopColor: '#F0E6D8',
            borderTopWidth: 1,
            paddingTop: 10,
            paddingBottom: 10,
            height: 70,
            shadowColor: '#8B7355',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarActiveTintColor: '#8B7355',
          tabBarInactiveTintColor: '#C4B8A8',
          headerStyle: {
            backgroundColor: '#FAF8F5',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: '#3D3229',
          },
          headerTintColor: '#3D3229',
        }}
      >
        <Tab.Screen
          name="Coach"
          component={CoachScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon="🧘" focused={focused} color={color} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Coach" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            headerTitle: 'Your Journey',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon="📅" focused={focused} color={color} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Timeline" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Summary"
          component={WeeklySummaryScreen}
          options={{
            headerTitle: 'Weekly Reflection',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon="📊" focused={focused} color={color} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Summary" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            headerTitle: 'Settings',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon="⚙️" focused={focused} color={color} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Settings" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
  },
});

export default App;
