import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text, Appbar, Card } from 'react-native-paper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext.tsx';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type UserinfoScreenNavigationProp = NavigationProp<RootStackParamList>;

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
      <Appbar.Header>
        <Appbar.Content title="사용자 정보" />
        <Appbar.Action icon="pencil" onPress={goToChangeUserInfo} />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Section */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Text variant="headlineMedium" style={styles.userName}>
                {user?.first_name || '사용자'}님
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="business"
                  size={scale(20)}
                  color="#F47725"
                  style={styles.infoIcon}
                />
                <Text variant="bodyMedium" style={styles.infoText}>
                  {user?.region} • {user?.team}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="warehouse"
                  size={scale(20)}
                  color="#F47725"
                  style={styles.infoIcon}
                />
                <Text variant="bodyMedium" style={styles.infoText}>
                  {user?.my_warehouse?.warehouse_name || '창고 정보 없음'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {contents.map((content, index) => (
            <TouchableOpacity key={index} onPress={content.onPress}>
              <Card style={styles.menuCard}>
                <Card.Content>
                  <View style={styles.menuRow}>
                    <View style={styles.menuLeft}>
                      <MaterialCommunityIcons
                        name={content.icon as any}
                        size={scale(24)}
                        color="#F47725"
                        style={styles.menuIcon}
                      />
                      <Text variant="titleMedium" style={styles.menuTitle}>
                        {content.title}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={scale(24)}
                      color="#666666"
                    />
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
  },
  profileCard: {
    marginBottom: verticalScale(24),
    elevation: 2,
  },
  profileHeader: {
    marginBottom: verticalScale(16),
  },
  userName: {
    fontWeight: '700',
    color: '#333333',
  },
  profileInfo: {
    gap: verticalScale(12),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: scale(12),
  },
  infoText: {
    color: '#666666',
    flex: 1,
  },
  menuContainer: {
    gap: verticalScale(8),
  },
  menuCard: {
    elevation: 1,
  },
  menuRow: {
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
    marginRight: scale(12),
  },
  menuTitle: {
    color: '#333333',
    fontWeight: '600',
  },
});

export default UserinfoScreen;
