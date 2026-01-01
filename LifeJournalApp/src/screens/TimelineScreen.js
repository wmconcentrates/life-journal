import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Animated,
} from 'react-native';
import { insightsAPI } from '../services/api';

const TimelineScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadEvents = useCallback(async () => {
    try {
      const response = await insightsAPI.getTestInsights();
      if (response.success && response.stats) {
        const mockEvents = createMockEvents(response.stats);
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('Load events error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const createMockEvents = (stats) => {
    const events = [];
    const today = new Date();

    if (stats.locations?.placesVisited) {
      stats.locations.placesVisited.forEach((place, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - Math.floor(i / 3));
        date.setHours(8 + (i % 12));

        events.push({
          id: `loc-${i}`,
          type: 'location',
          title: place,
          subtitle: `${Math.floor(Math.random() * 120) + 30} min`,
          time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          date: date.toISOString().split('T')[0],
        });
      });
    }

    if (stats.spending?.categoryBreakdown) {
      Object.entries(stats.spending.categoryBreakdown).forEach(([category, data], i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        events.push({
          id: `purchase-${i}`,
          type: 'purchase',
          title: category,
          subtitle: `$${data.amount.toFixed(2)} (${data.count} items)`,
          time: '12:00 PM',
          date: date.toISOString().split('T')[0],
        });
      });
    }

    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const filteredEvents = events.filter(
    (e) => e.date === selectedDate.toISOString().split('T')[0]
  );

  const changeMonth = (delta) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'location': return '📍';
      case 'purchase': return '🛍️';
      case 'activity': return '🏃';
      case 'photo': return '📷';
      default: return '✨';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'location': return '#D4A574';
      case 'purchase': return '#8B9B7A';
      case 'activity': return '#C4956A';
      case 'photo': return '#A68B7C';
      default: return '#8B7355';
    }
  };

  const renderEvent = ({ item, index }) => (
    <Animated.View
      style={[
        styles.eventCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.eventIcon, { backgroundColor: getEventColor(item.type) + '20' }]}>
        <Text style={styles.eventIconText}>{getEventIcon(item.type)}</Text>
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventSubtitle}>{item.subtitle}</Text>
        {item.time && <Text style={styles.eventTime}>{item.time}</Text>}
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7355" />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
          <Text style={styles.monthArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Week Days */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekContainer}>
        {getWeekDays().map((day) => {
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDate(day)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayToday]}>
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Events List */}
      {filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.eventsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B7355"
              colors={['#8B7355']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyTitle}>A quiet day</Text>
          <Text style={styles.emptySubtitle}>Sometimes the best days are the simple ones</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFCF8',
  },
  arrowButton: {
    padding: 8,
  },
  monthArrow: {
    fontSize: 32,
    color: '#D4A574',
    fontWeight: '300',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3D3229',
    letterSpacing: 0.5,
  },
  weekContainer: {
    backgroundColor: '#FFFCF8',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D8',
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderRadius: 16,
    minWidth: 52,
  },
  dayCellSelected: {
    backgroundColor: '#8B7355',
  },
  dayName: {
    fontSize: 12,
    color: '#8B7355',
    marginBottom: 6,
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3229',
  },
  dayTextSelected: {
    color: '#FFFCF8',
  },
  dayToday: {
    color: '#D4A574',
  },
  eventsList: {
    padding: 20,
    paddingBottom: 40,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0E6D8',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  eventIconText: {
    fontSize: 22,
  },
  eventContent: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D3229',
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 14,
    color: '#6B5B4F',
  },
  eventTime: {
    fontSize: 12,
    color: '#A89888',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3D3229',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default TimelineScreen;
