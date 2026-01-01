import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { insightsAPI } from '../services/api';

const TimelineScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      // Using test insights which includes events
      const response = await insightsAPI.getTestInsights();
      if (response.success && response.stats) {
        // Create mock events from stats
        const mockEvents = createMockEvents(response.stats);
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('Load events error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

    // Add location events
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

    // Add purchase events
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

  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
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
      case 'location':
        return '📍';
      case 'purchase':
        return '🛒';
      case 'activity':
        return '🏃';
      case 'photo':
        return '📷';
      default:
        return '📌';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'location':
        return '#007AFF';
      case 'purchase':
        return '#34C759';
      case 'activity':
        return '#FF9500';
      case 'photo':
        return '#AF52DE';
      default:
        return '#8E8E93';
    }
  };

  const renderEvent = ({ item }) => (
    <View style={styles.eventCard}>
      <View style={[styles.eventIcon, { backgroundColor: getEventColor(item.type) + '20' }]}>
        <Text style={styles.eventIconText}>{getEventIcon(item.type)}</Text>
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventSubtitle}>{item.subtitle}</Text>
        {item.time && <Text style={styles.eventTime}>{item.time}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
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
            >
              <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected, isToday && styles.dayToday]}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No events</Text>
          <Text style={styles.emptySubtitle}>No events recorded for this day</Text>
        </View>
      )}
    </View>
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  monthArrow: {
    fontSize: 28,
    color: '#007AFF',
    paddingHorizontal: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 48,
  },
  dayCellSelected: {
    backgroundColor: '#007AFF',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dayTextSelected: {
    color: '#fff',
  },
  dayToday: {
    color: '#007AFF',
  },
  eventsList: {
    padding: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventIconText: {
    fontSize: 20,
  },
  eventContent: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default TimelineScreen;
