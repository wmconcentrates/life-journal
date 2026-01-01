import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VOID } from '../theme/colors';
import Orb from '../components/Orb';
import { healthAPI, timelineAPI, settingsAPI, contextAPI } from '../services/api';

const SettingsScreen = () => {
  const [serverStatus, setServerStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState({
    proactiveNotifications: false,
    googleCalendarConnected: false,
  });
  const [contextItems, setContextItems] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkServerStatus();
    loadSettings();
    loadContext();
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.get();
      if (response.success && response.settings) {
        setSettings({
          proactiveNotifications: response.settings.proactive_notifications || false,
          googleCalendarConnected: response.settings.google_calendar_connected || false,
        });
      }
    } catch (error) {
      // Settings may not exist yet for new users
      console.log('Settings not found, using defaults');
    }
  };

  const loadContext = async () => {
    try {
      const response = await contextAPI.get();
      if (response.success && response.context) {
        setContextItems(response.context);
      }
    } catch (error) {
      console.log('Context not found');
    }
  };

  const toggleNotifications = async (value) => {
    setSettings(prev => ({ ...prev, proactiveNotifications: value }));
    try {
      await settingsAPI.update({ proactive_notifications: value });
    } catch (error) {
      // Revert on error
      setSettings(prev => ({ ...prev, proactiveNotifications: !value }));
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleConnectCalendar = () => {
    Alert.alert(
      'Google Calendar',
      'This will allow the coach to see your upcoming events for personalized greetings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: () => {
          // TODO: Implement Google Calendar OAuth
          Alert.alert('Coming Soon', 'Google Calendar integration will be available in a future update.');
        }},
      ]
    );
  };

  const handleViewMemory = () => {
    if (contextItems.length === 0) {
      Alert.alert('Coach Memory', "The coach hasn't learned anything about you yet. Start chatting to build context!");
      return;
    }

    const memoryList = contextItems.map(item =>
      `• ${item.context_type}: ${item.context || 'Details stored'}`
    ).join('\n');

    Alert.alert(
      'What Coach Remembers',
      memoryList,
      [
        { text: 'OK' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: handleClearMemory,
        },
      ]
    );
  };

  const handleClearMemory = () => {
    Alert.alert(
      'Clear Memory?',
      'This will delete everything the coach has learned about you. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const item of contextItems) {
                await contextAPI.delete(item.id);
              }
              setContextItems([]);
              Alert.alert('Memory Cleared', 'The coach has forgotten everything.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear memory');
            }
          },
        },
      ]
    );
  };

  const checkServerStatus = async () => {
    try {
      const response = await healthAPI.test();
      setServerStatus(response);
    } catch (error) {
      setServerStatus({ status: 'error', message: error.message });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await timelineAPI.testSync();
      Alert.alert(
        'Sync Complete',
        `Added ${response.eventsAdded} events from ${Object.keys(response.sources || {}).length} sources`
      );
    } catch (error) {
      Alert.alert('Sync Failed', error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[VOID.deep, VOID.dark, '#0F0F18']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeIn }}>
          {/* Coach Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COACH</Text>
            <View style={styles.card}>
              {/* Proactive Check-ins Toggle */}
              <View style={styles.settingRow}>
                <Orb size={44} color={VOID.orb.primary} intensity={0.5}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                </Orb>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Proactive Check-ins</Text>
                  <Text style={styles.serviceStatusPending}>Coach reaches out to you</Text>
                </View>
                <Switch
                  value={settings.proactiveNotifications}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: VOID.border.medium, true: VOID.orb.primary + '80' }}
                  thumbColor={settings.proactiveNotifications ? VOID.orb.primary : VOID.text.muted}
                />
              </View>

              <View style={styles.divider} />

              {/* Google Calendar */}
              <TouchableOpacity style={styles.serviceRow} onPress={handleConnectCalendar} activeOpacity={0.7}>
                <Orb size={44} color={VOID.orb.secondary} intensity={0.5}>
                  <Text style={{ fontSize: 20 }}>📅</Text>
                </Orb>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Google Calendar</Text>
                  <Text style={settings.googleCalendarConnected ? styles.serviceStatus : styles.serviceStatusPending}>
                    {settings.googleCalendarConnected ? 'Connected' : 'Not connected'}
                  </Text>
                </View>
                {settings.googleCalendarConnected ? (
                  <View style={styles.connectedDot} />
                ) : (
                  <Text style={styles.connectText}>Connect</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Coach Memory */}
              <TouchableOpacity style={styles.serviceRow} onPress={handleViewMemory} activeOpacity={0.7}>
                <Orb size={44} color={VOID.orb.accent} intensity={0.5}>
                  <Text style={{ fontSize: 20 }}>🧠</Text>
                </Orb>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Coach Memory</Text>
                  <Text style={styles.serviceStatusPending}>
                    {contextItems.length > 0 ? `${contextItems.length} things remembered` : 'Nothing yet'}
                  </Text>
                </View>
                <Text style={styles.viewText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Connected Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONNECTIONS</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.serviceRow} activeOpacity={0.7}>
                <Orb size={44} color={VOID.orb.cool} intensity={0.5}>
                  <Text style={{ fontSize: 20 }}>🗺️</Text>
                </Orb>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Google Maps</Text>
                  <Text style={styles.serviceStatus}>Connected</Text>
                </View>
                <View style={styles.connectedDot} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.serviceRow} activeOpacity={0.7}>
                <Orb size={44} color={VOID.orb.warm} intensity={0.5}>
                  <Text style={{ fontSize: 20 }}>🛍️</Text>
                </Orb>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Amazon</Text>
                  <Text style={styles.serviceStatusPending}>Not connected</Text>
                </View>
                <Text style={styles.connectText}>Connect</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.serviceRow} activeOpacity={0.7}>
                <Orb size={44} color={VOID.orb.accent} intensity={0.5}>
                  <Text style={{ fontSize: 20 }}>📷</Text>
                </Orb>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Photos</Text>
                  <Text style={styles.serviceStatus}>Connected</Text>
                </View>
                <View style={styles.connectedDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sync */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DATA</Text>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSync}
              disabled={syncing}
              activeOpacity={0.8}
            >
              <Orb size={50} color={VOID.orb.primary} intensity={syncing ? 0.3 : 0.6} pulse={syncing}>
                {syncing ? (
                  <ActivityIndicator color={VOID.text.primary} size="small" />
                ) : (
                  <Text style={{ fontSize: 22 }}>🔄</Text>
                )}
              </Orb>
              <View style={styles.syncInfo}>
                <Text style={styles.syncTitle}>Sync Now</Text>
                <Text style={styles.syncSubtitle}>Pull latest data from all sources</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Server Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYSTEM STATUS</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Server</Text>
                <View style={styles.statusValue}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          serverStatus?.status === 'ok' ? VOID.orb.success : VOID.orb.accent,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          serverStatus?.status === 'ok' ? VOID.orb.success : VOID.orb.accent,
                      },
                    ]}
                  >
                    {serverStatus?.status === 'ok' ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Encryption</Text>
                <Text style={styles.statusValueText}>
                  {serverStatus?.encryption || '—'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Database</Text>
                <Text style={styles.statusValueText}>
                  {serverStatus?.supabase || '—'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>AI Engine</Text>
                <Text style={styles.statusValueText}>{serverStatus?.claude || '—'}</Text>
              </View>
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Version</Text>
                <Text style={styles.statusValueText}>1.0.0</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VOID.deep,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: VOID.text.muted,
    letterSpacing: 2,
    marginBottom: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: VOID.elevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: VOID.border.subtle,
    overflow: 'hidden',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    color: VOID.text.primary,
    fontWeight: '500',
  },
  serviceStatus: {
    fontSize: 13,
    color: VOID.orb.success,
    marginTop: 2,
  },
  serviceStatusPending: {
    fontSize: 13,
    color: VOID.text.muted,
    marginTop: 2,
  },
  connectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: VOID.orb.success,
  },
  connectText: {
    fontSize: 14,
    color: VOID.orb.primary,
    fontWeight: '600',
  },
  viewText: {
    fontSize: 14,
    color: VOID.orb.secondary,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  divider: {
    height: 1,
    backgroundColor: VOID.border.subtle,
    marginLeft: 76,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VOID.elevated,
    borderRadius: 20,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: VOID.border.subtle,
  },
  syncInfo: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 16,
    color: VOID.text.primary,
    fontWeight: '500',
  },
  syncSubtitle: {
    fontSize: 13,
    color: VOID.text.muted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  statusLabel: {
    fontSize: 15,
    color: VOID.text.secondary,
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  statusValueText: {
    fontSize: 15,
    color: VOID.text.muted,
    fontWeight: '500',
  },
  bottomSpace: {
    height: 40,
  },
});

export default SettingsScreen;
