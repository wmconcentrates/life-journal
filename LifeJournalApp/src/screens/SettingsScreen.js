import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { healthAPI, timelineAPI } from '../services/api';

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const [serverStatus, setServerStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkServerStatus();
  }, []);

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

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountEmail}>{user?.email || 'User'}</Text>
              <Text style={styles.accountStatus}>Signed in</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Connected Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Services</Text>
        <View style={styles.card}>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceIcon}>🗺️</Text>
            <Text style={styles.serviceName}>Google Maps</Text>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.serviceRow}>
            <Text style={styles.serviceIcon}>🛒</Text>
            <Text style={styles.serviceName}>Amazon</Text>
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.serviceRow}>
            <Text style={styles.serviceIcon}>📷</Text>
            <Text style={styles.serviceName}>Photos</Text>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={handleSync} disabled={syncing}>
            <Text style={styles.menuIcon}>🔄</Text>
            <Text style={styles.menuText}>Sync Now</Text>
            {syncing && <ActivityIndicator size="small" color="#007AFF" />}
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow}>
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={styles.menuText}>Privacy & Data</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Server Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Status</Text>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text
              style={[
                styles.statusValue,
                { color: serverStatus?.status === 'ok' ? '#34C759' : '#FF3B30' },
              ]}
            >
              {serverStatus?.status === 'ok' ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Encryption</Text>
            <Text style={styles.statusValue}>{serverStatus?.encryption || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Database</Text>
            <Text style={styles.statusValue}>{serverStatus?.supabase || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>AI</Text>
            <Text style={styles.statusValue}>{serverStatus?.claude || '—'}</Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  accountInfo: {
    flex: 1,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  accountStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  connectedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 52,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  menuArrow: {
    fontSize: 20,
    color: '#999',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusValue: {
    fontSize: 16,
    color: '#666',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#333',
  },
  aboutValue: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 32,
  },
});

export default SettingsScreen;
