import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Bus, User } from 'lucide-react-native';
import { COLORS } from '@/constants/config';

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === '/dashboard';
  const isProfile = pathname === '/child-profile' || pathname?.startsWith('/child-profile');

  const handleMyBusPress = () => {
    if (!isDashboard) {
      router.replace('/dashboard');
    }
  };

  const handleProfilePress = () => {
    if (!isProfile) {
      router.replace('/child-profile');
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.tab}
          onPress={handleMyBusPress}
          activeOpacity={0.7}
        >
          <Bus
            size={24}
            color={isDashboard ? COLORS.primary : COLORS.textLight}
            strokeWidth={isDashboard ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              isDashboard ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            My Bus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <User
            size={24}
            color={isProfile ? COLORS.primary : COLORS.textLight}
            strokeWidth={isProfile ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              isProfile ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  tabLabelInactive: {
    color: COLORS.textLight,
  },
});

