import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { insightsAPI } from '../services/api';

const WeeklySummaryScreen = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

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
      startAnimations();
    }
  }, []);

  const startAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    cardAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + i * 100,
        useNativeDriver: true,
      }).start();
    });
  };

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
        <ActivityIndicator size="large" color="#8B7355" />
        <Text style={styles.loadingText}>Gathering your week...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8B7355"
          colors={['#8B7355']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Week Header */}
      <Animated.View style={[styles.weekHeader, { opacity: fadeAnim }]}>
        <Text style={styles.weekNumber}>Week {getWeekNumber()}</Text>
        <Text style={styles.dateRange}>{getDateRange()}</Text>
      </Animated.View>

      {/* Stats Grid */}
      <Animated.View
        style={[
          styles.statsGrid,
          {
            opacity: cardAnims[0],
            transform: [
              {
                translateY: cardAnims[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📍</Text>
          <Text style={styles.statValue}>
            {insights?.stats?.locations?.uniquePlaces || 0}
          </Text>
          <Text style={styles.statLabel}>Places</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🛍️</Text>
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
          <Text style={styles.statLabel}>Spent</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📷</Text>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Moments</Text>
        </View>
      </Animated.View>

      {/* Summary */}
      {insights?.summary && (
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardAnims[1],
              transform: [
                {
                  translateY: cardAnims[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [15, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📖</Text>
            <Text style={styles.cardTitle}>Your Week</Text>
          </View>
          <Text style={styles.summaryText}>{insights.summary}</Text>
        </Animated.View>
      )}

      {/* Coach Insight */}
      {insights?.coachInsight && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setInsightExpanded(!insightExpanded)}
        >
          <Animated.View
            style={[
              styles.card,
              styles.insightCard,
              {
                opacity: cardAnims[2],
                transform: [
                  {
                    translateY: cardAnims[2].interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>💭</Text>
              <Text style={[styles.cardTitle, styles.insightTitle]}>Coach Says...</Text>
              <Text style={styles.expandIcon}>{insightExpanded ? '▲' : '▼'}</Text>
            </View>
            <Text
              style={styles.insightText}
              numberOfLines={insightExpanded ? undefined : 4}
            >
              {insights.coachInsight}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Spending Breakdown */}
      {insights?.stats?.spending?.categoryBreakdown && (
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardAnims[3],
              transform: [
                {
                  translateY: cardAnims[3].interpolate({
                    inputRange: [0, 1],
                    outputRange: [15, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>Where It Went</Text>
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
        </Animated.View>
      )}

      {/* Places Visited */}
      {insights?.stats?.locations?.placesVisited && (
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardAnims[3],
              transform: [
                {
                  translateY: cardAnims[3].interpolate({
                    inputRange: [0, 1],
                    outputRange: [15, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🗺️</Text>
            <Text style={styles.cardTitle}>Places You've Been</Text>
          </View>
          <View style={styles.placesContainer}>
            {insights.stats.locations.placesVisited.slice(0, 8).map((place, i) => (
              <View key={i} style={styles.placeTag}>
                <Text style={styles.placeText}>{place}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
  },
  loadingText: {
    marginTop: 16,
    color: '#8B7355',
    fontSize: 16,
    fontWeight: '500',
  },
  weekHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#FFFCF8',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D8',
  },
  weekNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D3229',
    letterSpacing: -0.5,
  },
  dateRange: {
    fontSize: 15,
    color: '#8B7355',
    marginTop: 6,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#FFFCF8',
  },
  statCard: {
    width: '50%',
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D3229',
  },
  statLabel: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#F0E6D8',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3D3229',
    flex: 1,
    letterSpacing: 0.3,
  },
  summaryText: {
    fontSize: 15,
    color: '#6B5B4F',
    lineHeight: 24,
  },
  insightCard: {
    backgroundColor: '#FFF9F0',
    borderColor: '#F0E6D8',
  },
  insightTitle: {
    color: '#D4A574',
  },
  expandIcon: {
    fontSize: 12,
    color: '#C4A98A',
  },
  insightText: {
    fontSize: 16,
    color: '#5C4D3C',
    lineHeight: 26,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  categoryName: {
    fontSize: 15,
    color: '#3D3229',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B7355',
  },
  placesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  placeTag: {
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  placeText: {
    fontSize: 14,
    color: '#6B5B4F',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});

export default WeeklySummaryScreen;
