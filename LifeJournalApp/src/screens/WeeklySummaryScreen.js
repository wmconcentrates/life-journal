import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { insightsAPI } from '../services/api';

const WeeklySummaryScreen = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      const response = await insightsAPI.getTestInsights();
      if (response.success) {
        setInsights(response);
      }
    } catch (error) {
      console.error('Load insights error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInsights();
  };

  const getWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 604800000;
    return Math.ceil(diff / oneWeek);
  };

  const getDateRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(startOfWeek)} - ${format(endOfWeek)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Week Header */}
      <View style={styles.weekHeader}>
        <Text style={styles.weekNumber}>Week {getWeekNumber()}</Text>
        <Text style={styles.dateRange}>{getDateRange()}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📍</Text>
          <Text style={styles.statValue}>
            {insights?.stats?.locations?.uniquePlaces || 0}
          </Text>
          <Text style={styles.statLabel}>Locations</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🛒</Text>
          <Text style={styles.statValue}>
            {insights?.stats?.spending?.totalOrders || 0}
          </Text>
          <Text style={styles.statLabel}>Purchases</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>
            ${insights?.stats?.spending?.totalSpent?.toFixed(0) || 0}
          </Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📷</Text>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>
      </View>

      {/* Summary */}
      {insights?.summary && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitle}>This Week</Text>
          </View>
          <Text style={styles.summaryText}>{insights.summary}</Text>
        </View>
      )}

      {/* Coach Insight */}
      {insights?.coachInsight && (
        <TouchableOpacity
          style={[styles.card, styles.insightCard]}
          onPress={() => setInsightExpanded(!insightExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💡</Text>
            <Text style={[styles.cardTitle, styles.insightTitle]}>Coach Insight</Text>
            <Text style={styles.expandIcon}>{insightExpanded ? '▲' : '▼'}</Text>
          </View>
          <Text
            style={styles.insightText}
            numberOfLines={insightExpanded ? undefined : 4}
          >
            {insights.coachInsight}
          </Text>
        </TouchableOpacity>
      )}

      {/* Spending Breakdown */}
      {insights?.stats?.spending?.categoryBreakdown && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>Spending by Category</Text>
          </View>
          {Object.entries(insights.stats.spending.categoryBreakdown)
            .sort((a, b) => b[1].amount - a[1].amount)
            .slice(0, 5)
            .map(([category, data]) => (
              <View key={category} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryAmount}>${data.amount.toFixed(2)}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Places Visited */}
      {insights?.stats?.locations?.placesVisited && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🗺️</Text>
            <Text style={styles.cardTitle}>Places Visited</Text>
          </View>
          <View style={styles.placesContainer}>
            {insights.stats.locations.placesVisited.slice(0, 8).map((place, i) => (
              <View key={i} style={styles.placeTag}>
                <Text style={styles.placeText}>{place}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  weekHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  weekNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dateRange: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    backgroundColor: '#fff',
    marginTop: 1,
  },
  statCard: {
    width: '50%',
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  insightCard: {
    backgroundColor: '#FFF8E7',
  },
  insightTitle: {
    color: '#FF9500',
  },
  expandIcon: {
    fontSize: 12,
    color: '#999',
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  placesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  placeTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  placeText: {
    fontSize: 13,
    color: '#1976D2',
  },
  bottomPadding: {
    height: 32,
  },
});

export default WeeklySummaryScreen;
