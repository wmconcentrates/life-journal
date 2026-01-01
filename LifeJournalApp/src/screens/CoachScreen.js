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
import { insightsAPI } from '../services/api';

const { width } = Dimensions.get('window');

// Coach persona: Matthew McConaughey meets The Dude
const COACH_PHRASES = {
  encouragement: [
    "Alright alright alright... you're doing beautiful work here.",
    "That's the thing about life, man. You just gotta keep on keepin' on.",
    "Hey, you showed up today. That's half the battle right there, brother.",
    "The Dude abides, and so do you. Keep that energy.",
    "You're doing better than you think. Trust me on that one.",
    "Life's a garden, dig it? And you're planting good seeds.",
  ],
  weekly: [
    "You crushed it this week. Take a breath, you earned it.",
    "Look at you, making moves. That's beautiful, man.",
    "Another week in the books. And you know what? You handled it.",
    "The universe tends to unfold as it should. And this week? It unfolded pretty nicely for you.",
  ],
  reflection: [
    "Take a moment. Breathe. You're exactly where you need to be.",
    "Sometimes you gotta slow down to speed up, you know what I mean?",
    "Life's about the journey, not just the destination. Enjoy the ride.",
  ],
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
};

const getGreeting = () => {
  const timeOfDay = getTimeOfDay();
  switch (timeOfDay) {
    case 'morning':
      return "Rise and shine, buddy. Let's make today count.";
    case 'afternoon':
      return "Afternoon, my friend. You're doing better than you think.";
    case 'evening':
      return "Evening, brother. Reflect on the good stuff today.";
    default:
      return "Hey there, friend. Good to see you.";
  }
};

const getRandomPhrase = (category) => {
  const phrases = COACH_PHRASES[category];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

const CoachScreen = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting] = useState(getGreeting());
  const [encouragement] = useState(getRandomPhrase('encouragement'));

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    loadInsights();
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Greeting fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered card animations
    cardAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 400 + index * 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const loadInsights = async () => {
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
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInsights();
  };

  const getTimeIcon = () => {
    const timeOfDay = getTimeOfDay();
    switch (timeOfDay) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌙';
      default: return '✨';
    }
  };

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
      {/* Hero Greeting Section */}
      <Animated.View
        style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.timeIcon}>{getTimeIcon()}</Text>
        <Text style={styles.greeting}>{greeting}</Text>
        <View style={styles.divider} />
        <Text style={styles.encouragement}>{encouragement}</Text>
      </Animated.View>

      {/* Weekly Insight Card */}
      {insights?.coachInsight && (
        <Animated.View
          style={[
            styles.insightCard,
            {
              opacity: cardAnimations[0],
              transform: [
                {
                  translateY: cardAnimations[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💭</Text>
            <Text style={styles.cardTitle}>This Week's Wisdom</Text>
          </View>
          <Text style={styles.insightText}>{insights.coachInsight}</Text>
        </Animated.View>
      )}

      {/* Summary Card */}
      {insights?.summary && (
        <Animated.View
          style={[
            styles.summaryCard,
            {
              opacity: cardAnimations[1],
              transform: [
                {
                  translateY: cardAnimations[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📖</Text>
            <Text style={styles.cardTitle}>Your Week in Review</Text>
          </View>
          <Text style={styles.summaryText}>{insights.summary}</Text>
        </Animated.View>
      )}

      {/* Quick Stats */}
      {insights?.stats && (
        <Animated.View
          style={[
            styles.statsCard,
            {
              opacity: cardAnimations[2],
              transform: [
                {
                  translateY: cardAnimations[2].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>✨</Text>
            <Text style={styles.cardTitle}>Highlights</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {insights.stats.locations?.uniquePlaces || 0}
              </Text>
              <Text style={styles.statLabel}>Places Explored</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ${insights.stats.spending?.totalSpent?.toFixed(0) || 0}
              </Text>
              <Text style={styles.statLabel}>Invested in Life</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Reflection Prompt */}
      <Animated.View
        style={[
          styles.reflectionCard,
          {
            opacity: cardAnimations[2],
            transform: [
              {
                translateY: cardAnimations[2].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.reflectionText}>
          {getRandomPhrase('reflection')}
        </Text>
      </Animated.View>

      {/* Breathing Space */}
      <View style={styles.bottomSpace} />
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
  heroSection: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  timeIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#3D3229',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: '#D4A574',
    borderRadius: 2,
    marginVertical: 24,
  },
  encouragement: {
    fontSize: 18,
    color: '#6B5B4F',
    textAlign: 'center',
    lineHeight: 28,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  insightCard: {
    backgroundColor: '#FFF9F0',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0E6D8',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0E6D8',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0E6D8',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D3229',
    letterSpacing: 0.3,
  },
  insightText: {
    fontSize: 17,
    color: '#5C4D3C',
    lineHeight: 28,
  },
  summaryText: {
    fontSize: 16,
    color: '#6B5B4F',
    lineHeight: 26,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#D4A574',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8B7355',
    fontWeight: '500',
  },
  reflectionCard: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  reflectionText: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  bottomSpace: {
    height: 40,
  },
});

export default CoachScreen;
