import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VOID } from '../theme/colors';
import Orb from '../components/Orb';
import { insightsAPI } from '../services/api';

const { width } = Dimensions.get('window');

const WeeklySummaryScreen = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const orbAnims = useRef([
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
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    orbAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 1,
        friction: 8,
        tension: 40,
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
        <LinearGradient
          colors={[VOID.deep, VOID.dark]}
          style={StyleSheet.absoluteFill}
        />
        <Orb size={80} color={VOID.orb.secondary} pulse>
          <ActivityIndicator color={VOID.text.primary} />
        </Orb>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[VOID.deep, VOID.dark, '#0F0F18']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={VOID.orb.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Week Header */}
        <Animated.View style={[styles.weekHeader, { opacity: fadeIn }]}>
          <Text style={styles.weekNumber}>Week {getWeekNumber()}</Text>
          <Text style={styles.dateRange}>{getDateRange()}</Text>
        </Animated.View>

        {/* Stats Orbs */}
        <View style={styles.statsGrid}>
          <Animated.View
            style={[
              styles.statItem,
              {
                opacity: orbAnims[0],
                transform: [
                  {
                    scale: orbAnims[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Orb size={85} color={VOID.orb.cool} intensity={0.7}>
              <Text style={styles.statValue}>
                {insights?.stats?.locations?.uniquePlaces || 0}
              </Text>
            </Orb>
            <Text style={styles.statLabel}>Places</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.statItem,
              {
                opacity: orbAnims[1],
                transform: [
                  {
                    scale: orbAnims[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Orb size={85} color={VOID.orb.warm} intensity={0.7}>
              <Text style={styles.statValue}>
                ${insights?.stats?.spending?.totalSpent?.toFixed(0) || 0}
              </Text>
            </Orb>
            <Text style={styles.statLabel}>Spent</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.statItem,
              {
                opacity: orbAnims[2],
                transform: [
                  {
                    scale: orbAnims[2].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Orb size={85} color={VOID.orb.accent} intensity={0.7}>
              <Text style={styles.statValue}>12</Text>
            </Orb>
            <Text style={styles.statLabel}>Photos</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.statItem,
              {
                opacity: orbAnims[3],
                transform: [
                  {
                    scale: orbAnims[3].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Orb size={85} color={VOID.orb.success} intensity={0.7}>
              <Text style={styles.statValue}>
                {insights?.stats?.spending?.totalOrders || 0}
              </Text>
            </Orb>
            <Text style={styles.statLabel}>Orders</Text>
          </Animated.View>
        </View>

        {/* Summary Card */}
        {insights?.summary && (
          <Animated.View style={[styles.card, { opacity: fadeIn }]}>
            <View style={styles.cardGlow} />
            <Text style={styles.cardLabel}>YOUR WEEK</Text>
            <Text style={styles.cardText}>{insights.summary}</Text>
          </Animated.View>
        )}

        {/* Coach Insight */}
        {insights?.coachInsight && (
          <Animated.View
            style={[styles.card, styles.insightCard, { opacity: fadeIn }]}
          >
            <View style={[styles.cardGlow, { backgroundColor: VOID.glow.secondary }]} />
            <View style={styles.insightHeader}>
              <Orb size={40} color={VOID.orb.secondary} intensity={0.5}>
                <Text style={{ fontSize: 18 }}>🧘</Text>
              </Orb>
              <Text style={styles.insightLabel}>COACH SAYS</Text>
            </View>
            <Text style={styles.insightText}>"{insights.coachInsight}"</Text>
          </Animated.View>
        )}

        {/* Categories */}
        {insights?.stats?.spending?.categoryBreakdown && (
          <Animated.View style={[styles.card, { opacity: fadeIn }]}>
            <Text style={styles.cardLabel}>WHERE IT WENT</Text>
            {Object.entries(insights.stats.spending.categoryBreakdown)
              .sort((a, b) => b[1].amount - a[1].amount)
              .slice(0, 5)
              .map(([category, data], i) => (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryBar}>
                    <View
                      style={[
                        styles.categoryFill,
                        {
                          width: `${(data.amount / insights.stats.spending.totalSpent) * 100}%`,
                          backgroundColor: [
                            VOID.orb.primary,
                            VOID.orb.secondary,
                            VOID.orb.accent,
                            VOID.orb.cool,
                            VOID.orb.warm,
                          ][i],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryName}>{category}</Text>
                  <Text style={styles.categoryAmount}>${data.amount.toFixed(0)}</Text>
                </View>
              ))}
          </Animated.View>
        )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  weekHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  weekNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: VOID.text.primary,
    letterSpacing: -1,
  },
  dateRange: {
    fontSize: 15,
    color: VOID.text.muted,
    marginTop: 8,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 28,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: VOID.text.primary,
  },
  statLabel: {
    fontSize: 13,
    color: VOID.text.secondary,
    marginTop: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    backgroundColor: VOID.elevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: VOID.border.subtle,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: VOID.glow.primary,
    opacity: 0.2,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: VOID.text.muted,
    letterSpacing: 2,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 16,
    color: VOID.text.secondary,
    lineHeight: 26,
  },
  insightCard: {
    backgroundColor: VOID.surface,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: VOID.orb.secondary,
    letterSpacing: 2,
  },
  insightText: {
    fontSize: 17,
    color: VOID.text.secondary,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryBar: {
    height: 6,
    backgroundColor: VOID.border.subtle,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryName: {
    fontSize: 14,
    color: VOID.text.secondary,
  },
  categoryAmount: {
    position: 'absolute',
    right: 0,
    fontSize: 14,
    color: VOID.text.primary,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 40,
  },
});

export default WeeklySummaryScreen;
