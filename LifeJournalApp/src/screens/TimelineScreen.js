import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VOID } from '../theme/colors';
import Orb from '../components/Orb';
import { insightsAPI } from '../services/api';

const { width, height } = Dimensions.get('window');
const CELL_SIZE = (width - 48) / 7;

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const ACTIVITY_BUTTONS = [
  { id: 'places', icon: '📍', label: 'Where I Went', color: VOID.orb.cool },
  { id: 'spending', icon: '💰', label: 'What I Spent', color: VOID.orb.warm },
  { id: 'people', icon: '👥', label: 'Who I Was With', color: VOID.orb.secondary },
  { id: 'photos', icon: '📷', label: 'Photos I Took', color: VOID.orb.accent },
  { id: 'activities', icon: '⚡', label: 'Things I Did', color: VOID.orb.success },
];

const COACH_DAY_SUMMARIES = [
  "Alright alright alright... looks like you had a solid day, brother.",
  "The Dude would be proud. You kept it real today.",
  "That's what I'm talking about. You showed up and made it count.",
  "Nice and easy does it. Today was a good one.",
  "You're living life, man. That's beautiful.",
];

const TimelineScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const createMockEvents = (stats) => {
    const events = {};
    const today = new Date();

    // Generate busy levels for each day
    for (let i = 0; i < 31; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      events[dateKey] = {
        busyLevel: Math.random(),
        places: stats.locations?.placesVisited?.slice(0, Math.floor(Math.random() * 4) + 1) || [],
        spending: Math.random() * 150,
        photos: Math.floor(Math.random() * 5),
        activities: Math.floor(Math.random() * 3) + 1,
      };
    }

    return events;
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days in month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  const handleDayPress = (day) => {
    if (!day) return;
    setSelectedDay(day);
    setSelectedActivity(null);
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedDay(null);
      setSelectedActivity(null);
    });
  };

  const getOrbColor = (busyLevel) => {
    if (busyLevel > 0.7) return VOID.orb.accent;
    if (busyLevel > 0.4) return VOID.orb.primary;
    if (busyLevel > 0.1) return VOID.orb.cool;
    return 'transparent';
  };

  const getOrbSize = (busyLevel) => {
    return 20 + busyLevel * 20;
  };

  const getDayData = (day) => {
    if (!day) return null;
    const dateKey = day.toISOString().split('T')[0];
    return events[dateKey];
  };

  const renderDay = (day, index) => {
    if (!day) {
      return <View key={`empty-${index}`} style={styles.dayCell} />;
    }

    const dayData = getDayData(day);
    const isToday = day.toDateString() === new Date().toDateString();
    const isSelected = selectedDay && day.toDateString() === selectedDay.toDateString();
    const busyLevel = dayData?.busyLevel || 0;

    return (
      <TouchableOpacity
        key={day.toISOString()}
        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
        onPress={() => handleDayPress(day)}
        activeOpacity={0.7}
      >
        {busyLevel > 0.1 && (
          <View style={styles.orbContainer}>
            <View
              style={[
                styles.dayOrb,
                {
                  width: getOrbSize(busyLevel),
                  height: getOrbSize(busyLevel),
                  borderRadius: getOrbSize(busyLevel) / 2,
                  backgroundColor: getOrbColor(busyLevel),
                  shadowColor: getOrbColor(busyLevel),
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                },
              ]}
            />
          </View>
        )}
        <Text
          style={[
            styles.dayNumber,
            isToday && styles.dayToday,
            busyLevel > 0.5 && styles.dayBusy,
          ]}
        >
          {day.getDate()}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[VOID.deep, VOID.dark]}
          style={StyleSheet.absoluteFill}
        />
        <Orb size={80} color={VOID.orb.primary} pulse>
          <ActivityIndicator color={VOID.text.primary} />
        </Orb>
      </View>
    );
  }

  const selectedDayData = selectedDay ? getDayData(selectedDay) : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[VOID.deep, VOID.dark, '#0F0F18']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* Month Header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((day, i) => (
            <View key={i} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {getDaysInMonth().map((day, index) => renderDay(day, index))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendOrb, { backgroundColor: VOID.orb.cool }]} />
            <Text style={styles.legendText}>Light</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendOrb, { backgroundColor: VOID.orb.primary }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendOrb, { backgroundColor: VOID.orb.accent }]} />
            <Text style={styles.legendText}>Busy</Text>
          </View>
        </View>
      </Animated.View>

      {/* Day Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: modalAnim,
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <LinearGradient
                colors={[VOID.elevated, VOID.surface]}
                style={styles.modalGradient}
              >
                {/* Date Header */}
                <Text style={styles.modalDate}>
                  {selectedDay?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>

                {/* Coach Summary */}
                <View style={styles.coachSummary}>
                  <Orb size={50} color={VOID.orb.primary} intensity={0.5}>
                    <Text style={{ fontSize: 22 }}>🧘</Text>
                  </Orb>
                  <Text style={styles.coachText}>
                    "{COACH_DAY_SUMMARIES[Math.floor(Math.random() * COACH_DAY_SUMMARIES.length)]}"
                  </Text>
                </View>

                {/* Activity Orb Buttons */}
                <Text style={styles.activityLabel}>EXPLORE YOUR DAY</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.activityScroll}
                  contentContainerStyle={styles.activityContainer}
                >
                  {ACTIVITY_BUTTONS.map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={styles.activityButton}
                      onPress={() => setSelectedActivity(activity.id)}
                      activeOpacity={0.8}
                    >
                      <Orb
                        size={60}
                        color={activity.color}
                        intensity={selectedActivity === activity.id ? 0.9 : 0.5}
                      >
                        <Text style={{ fontSize: 24 }}>{activity.icon}</Text>
                      </Orb>
                      <Text style={styles.activityLabel2}>{activity.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Activity Details */}
                {selectedActivity && selectedDayData && (
                  <View style={styles.activityDetails}>
                    {selectedActivity === 'places' && (
                      <View style={styles.detailContent}>
                        {selectedDayData.places.map((place, i) => (
                          <View key={i} style={styles.detailItem}>
                            <Text style={styles.detailIcon}>📍</Text>
                            <Text style={styles.detailText}>{place}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {selectedActivity === 'spending' && (
                      <View style={styles.detailContent}>
                        <Text style={styles.detailBig}>
                          ${selectedDayData.spending.toFixed(2)}
                        </Text>
                        <Text style={styles.detailSubtext}>spent today</Text>
                      </View>
                    )}
                    {selectedActivity === 'photos' && (
                      <View style={styles.detailContent}>
                        <Text style={styles.detailBig}>{selectedDayData.photos}</Text>
                        <Text style={styles.detailSubtext}>photos captured</Text>
                      </View>
                    )}
                    {selectedActivity === 'activities' && (
                      <View style={styles.detailContent}>
                        <Text style={styles.detailBig}>{selectedDayData.activities}</Text>
                        <Text style={styles.detailSubtext}>activities logged</Text>
                      </View>
                    )}
                    {selectedActivity === 'people' && (
                      <View style={styles.detailContent}>
                        <Text style={styles.detailSubtext}>No social data yet</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
    flex: 1,
    paddingTop: 60,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  arrowButton: {
    padding: 12,
  },
  arrow: {
    fontSize: 36,
    color: VOID.orb.primary,
    fontWeight: '200',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: VOID.text.primary,
    letterSpacing: 0.5,
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: VOID.text.muted,
    letterSpacing: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE * 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: VOID.border.subtle,
    borderRadius: 12,
  },
  orbContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOrb: {
    position: 'absolute',
    elevation: 8,
  },
  dayNumber: {
    fontSize: 16,
    color: VOID.text.secondary,
    fontWeight: '500',
    zIndex: 1,
  },
  dayToday: {
    color: VOID.orb.primary,
    fontWeight: '700',
  },
  dayBusy: {
    color: VOID.text.primary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendOrb: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: VOID.text.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 32,
    maxHeight: height * 0.8,
    borderRadius: 28,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: VOID.border.medium,
  },
  modalDate: {
    fontSize: 24,
    fontWeight: '600',
    color: VOID.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  coachSummary: {
    alignItems: 'center',
    marginBottom: 32,
  },
  coachText: {
    fontSize: 15,
    color: VOID.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: VOID.text.muted,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  activityScroll: {
    marginHorizontal: -28,
  },
  activityContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  activityButton: {
    alignItems: 'center',
    width: 80,
  },
  activityLabel2: {
    fontSize: 10,
    color: VOID.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  activityDetails: {
    marginTop: 24,
    padding: 20,
    backgroundColor: VOID.surface,
    borderRadius: 16,
  },
  detailContent: {
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  detailIcon: {
    fontSize: 18,
  },
  detailText: {
    fontSize: 15,
    color: VOID.text.secondary,
  },
  detailBig: {
    fontSize: 36,
    fontWeight: '700',
    color: VOID.text.primary,
  },
  detailSubtext: {
    fontSize: 14,
    color: VOID.text.muted,
    marginTop: 4,
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: VOID.border.subtle,
    borderRadius: 14,
  },
  closeText: {
    fontSize: 16,
    color: VOID.text.secondary,
    fontWeight: '600',
  },
});

export default TimelineScreen;
