import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VOID } from '../theme/colors';
import Orb from '../components/Orb';
import { insightsAPI, coachAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
};

const CoachScreen = ({ navigation }) => {
  const [insights, setInsights] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("Hey there, friend.\nGood to see you.");
  const [loadingCoach, setLoadingCoach] = useState(true);

  // Floating orb animations
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInsights();
    loadCoachMessages();
    startAnimations();
  }, []);

  const loadCoachMessages = async () => {
    try {
      setLoadingCoach(true);
      const timeOfDay = getTimeOfDay();

      // Try contextual greeting first (requires auth), fall back to simple greeting
      try {
        const contextualResult = await coachAPI.getContextualGreeting(timeOfDay);
        if (contextualResult.success && contextualResult.greeting) {
          setGreeting(contextualResult.greeting);
          return;
        }
      } catch {
        // Contextual greeting requires auth, fall back to simple
      }

      const greetingResult = await coachAPI.getGreeting(timeOfDay);
      if (greetingResult.success && greetingResult.greeting) {
        setGreeting(greetingResult.greeting);
      }
    } catch (error) {
      console.error('Coach messages error:', error);
      // Keep fallback greeting on error
    } finally {
      setLoadingCoach(false);
    }
  };

  const startAnimations = () => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Floating animations
    const createFloat = (anim, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createFloat(float1, 3000);
    createFloat(float2, 4000);
    createFloat(float3, 3500);
  };

  const loadInsights = async () => {
    try {
      const response = await insightsAPI.getTestInsights();
      if (response.success) {
        setInsights(response);
      }
    } catch (error) {
      console.error('Load insights error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadInsights(), loadCoachMessages()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[VOID.deep, VOID.dark, '#0F0F18']}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating background orbs */}
      <Animated.View
        style={[
          styles.bgOrb,
          {
            top: height * 0.1,
            left: width * 0.1,
            opacity: 0.15,
            transform: [
              {
                translateY: float1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                }),
              },
            ],
          },
        ]}
      >
        <Orb size={120} color={VOID.orb.primary} intensity={0.3} />
      </Animated.View>

      <Animated.View
        style={[
          styles.bgOrb,
          {
            top: height * 0.35,
            right: -30,
            opacity: 0.12,
            transform: [
              {
                translateY: float2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 15],
                }),
              },
            ],
          },
        ]}
      >
        <Orb size={180} color={VOID.orb.secondary} intensity={0.2} />
      </Animated.View>

      <Animated.View
        style={[
          styles.bgOrb,
          {
            bottom: height * 0.15,
            left: -40,
            opacity: 0.1,
            transform: [
              {
                translateY: float3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -12],
                }),
              },
            ],
          },
        ]}
      >
        <Orb size={140} color={VOID.orb.accent} intensity={0.2} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={VOID.orb.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Main Coach Orb */}
        <Animated.View style={[styles.coachSection, { opacity: fadeIn }]}>
          <Orb size={140} color={VOID.orb.primary} pulse intensity={0.8}>
            <Text style={styles.coachEmoji}>🧘</Text>
          </Orb>

          <Text style={styles.greeting}>{greeting}</Text>

          {/* Chat Button */}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.8}
          >
            <Orb size={60} color={VOID.orb.secondary} intensity={0.7}>
              <Text style={{ fontSize: 24 }}>💬</Text>
            </Orb>
            <Text style={styles.chatButtonText}>Chat with Coach</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Orbs */}
        {insights?.stats && (
          <Animated.View style={[styles.statsSection, { opacity: fadeIn }]}>
            <Text style={styles.sectionLabel}>THIS WEEK</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Orb size={70} color={VOID.orb.cool} intensity={0.6}>
                  <Text style={styles.statValue}>
                    {insights.stats.locations?.uniquePlaces || 0}
                  </Text>
                </Orb>
                <Text style={styles.statLabel}>Places</Text>
              </View>

              <View style={styles.statItem}>
                <Orb size={70} color={VOID.orb.warm} intensity={0.6}>
                  <Text style={styles.statValue}>
                    ${insights.stats.spending?.totalSpent?.toFixed(0) || 0}
                  </Text>
                </Orb>
                <Text style={styles.statLabel}>Spent</Text>
              </View>

              <View style={styles.statItem}>
                <Orb size={70} color={VOID.orb.accent} intensity={0.6}>
                  <Text style={styles.statValue}>12</Text>
                </Orb>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Insight Card */}
        {insights?.coachInsight && (
          <Animated.View style={[styles.insightCard, { opacity: fadeIn }]}>
            <View style={styles.insightGlow} />
            <Text style={styles.insightLabel}>COACH'S WISDOM</Text>
            <Text style={styles.insightText}>{insights.coachInsight}</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 80,
    paddingBottom: 40,
  },
  bgOrb: {
    position: 'absolute',
    zIndex: 0,
  },
  coachSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 48,
  },
  coachEmoji: {
    fontSize: 50,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: VOID.text.primary,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: VOID.elevated,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: VOID.border.subtle,
    gap: 12,
  },
  chatButtonText: {
    color: VOID.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: VOID.text.muted,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: VOID.text.primary,
  },
  statLabel: {
    fontSize: 13,
    color: VOID.text.secondary,
    marginTop: 12,
    fontWeight: '500',
  },
  insightCard: {
    marginHorizontal: 20,
    padding: 28,
    backgroundColor: VOID.elevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: VOID.border.subtle,
    overflow: 'hidden',
  },
  insightGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: VOID.glow.primary,
    opacity: 0.3,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: VOID.orb.primary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  insightText: {
    fontSize: 17,
    color: VOID.text.secondary,
    lineHeight: 28,
  },
  bottomSpace: {
    height: 60,
  },
});

export default CoachScreen;
