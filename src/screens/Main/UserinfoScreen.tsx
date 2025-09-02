import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text, Appbar } from 'react-native-paper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext.tsx';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type UserinfoScreenNavigationProp = NavigationProp<RootStackParamList>;

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F7F7F7',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E6E6E6',
  divider: '#F0F0F0',
};

const UserinfoScreen: React.FC = () => {
  const navigation = useNavigation<UserinfoScreenNavigationProp>();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const goToChangeUserInfo = () => {
    navigation.navigate('UserinfoStack', {
      screen: 'ChangeUserInfoScreen',
    });
  };

  const goToMyUnitList = () => {
    navigation.navigate('UserinfoStack', {
      screen: 'MyUnitListScreen',
    });
  };

  const goToMailBox = () => {
    navigation.navigate('UserinfoStack', {
      screen: 'MailBoxScreen',
    });
  };

  const contents = [
    {
      title: '보유 유니트',
      icon: 'home-group',
      onPress: goToMyUnitList,
    },
    {
      title: '결재함',
      icon: 'email-outline',
      onPress: goToMailBox,
    },
  ];

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="사용자 정보" titleStyle={styles.appbarTitle} />
        <Appbar.Action
          icon="pencil"
          iconColor={COLORS.textSecondary}
          onPress={goToChangeUserInfo}
        />
        <Appbar.Action
          icon="logout"
          iconColor={COLORS.textSecondary}
          onPress={handleLogout}
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons
                name="account-circle"
                size={scale(40)}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={styles.userName}>
                {user?.first_name || '사용자'}
              </Text>
              {/*<Text variant="bodyMedium" style={styles.userGreeting}>*/}
              {/*  안녕하세요!*/}
              {/*</Text>*/}
            </View>
          </View>

          <View style={styles.userDetails}>
            <View style={styles.detailItem}>
              <MaterialIcons
                name="business"
                size={scale(18)}
                color={COLORS.textSecondary}
                style={styles.detailIcon}
              />
              <Text variant="bodyMedium" style={styles.detailText}>
                {user?.region} • {user?.team}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialCommunityIcons
                name="warehouse"
                size={scale(18)}
                color={COLORS.textSecondary}
                style={styles.detailIcon}
              />
              <Text variant="bodyMedium" style={styles.detailText}>
                {user?.my_warehouse?.warehouse_name || '창고 정보 없음'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <Text variant="titleMedium" style={styles.menuHeaderTitle}>
              내 정보
            </Text>
          </View>

          <View style={styles.menuList}>
            {contents.map((content, index) => (
              <TouchableOpacity
                key={index}
                onPress={content.onPress}
                style={[
                  styles.menuItem,
                  index === contents.length - 1 && styles.menuItemLast,
                ]}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.menuLeft}>
                    <MaterialCommunityIcons
                      name={content.icon as any}
                      size={scale(22)}
                      color={COLORS.primary}
                      style={styles.menuIcon}
                    />
                    <Text variant="bodyLarge" style={styles.menuTitle}>
                      {content.title}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={scale(20)}
                    color={COLORS.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appbar: {
    backgroundColor: COLORS.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appbarTitle: {
    color: COLORS.text,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingBottom: verticalScale(20),
  },

  // Profile Section
  profileSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(24),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  avatarContainer: {
    marginRight: scale(16),
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(4),
  },
  userGreeting: {
    color: COLORS.textSecondary,
  },
  userDetails: {
    paddingLeft: scale(50), // Avatar size + margin
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  detailIcon: {
    marginRight: scale(8),
  },
  detailText: {
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Menu Section
  menuSection: {
    marginTop: verticalScale(8),
  },
  menuHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuHeaderTitle: {
    color: COLORS.text,
    fontWeight: '600',
  },
  menuList: {
    backgroundColor: COLORS.background,
  },
  menuItem: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: scale(16),
  },
  menuTitle: {
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default UserinfoScreen;
