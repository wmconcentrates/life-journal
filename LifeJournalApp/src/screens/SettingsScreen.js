import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { healthAPI, timelineAPI } from '../services/api';

const SettingsScreen = () => {
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.serviceIcon}>🛍️</Text>
            <Text style={styles.serviceName}>Amazon</Text>
            <TouchableOpacity style={styles.connectButton} activeOpacity={0.8}>
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
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>🔄</Text>
            <Text style={styles.menuText}>Sync Now</Text>
            {syncing && <ActivityIndicator size="small" color="#8B7355" />}
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
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
                { color: serverStatus?.status === 'ok' ? '#8B9B7A' : '#C4736C' },
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

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B7355',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E6D8',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  serviceIcon: {
    fontSize: 26,
    marginRight: 14,
  },
  serviceName: {
    fontSize: 16,
    color: '#3D3229',
    flex: 1,
    fontWeight: '500',
  },
  connectedBadge: {
    backgroundColor: '#E8F0E4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  connectedText: {
    fontSize: 12,
    color: '#6B8B5E',
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#8B7355',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  connectButtonText: {
    fontSize: 12,
    color: '#FFFCF8',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F0E8',
    marginLeft: 58,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  menuText: {
    fontSize: 16,
    color: '#3D3229',
    flex: 1,
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 22,
    color: '#C4B8A8',
    fontWeight: '300',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  statusLabel: {
    fontSize: 16,
    color: '#3D3229',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    color: '#8B7355',
    fontWeight: '500',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#3D3229',
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 16,
    color: '#8B7355',
  },
  bottomPadding: {
    height: 50,
  },
});

export default SettingsScreen;
