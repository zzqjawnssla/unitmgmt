import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Surface, Text, useTheme, Appbar } from 'react-native-paper';
import { useAuth } from '../../store/AuthContext.tsx';
import { scale, verticalScale } from 'react-native-size-matters';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { useMyUnits, useLatestPosts } from '../../hooks/useSelectList.ts';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [isFocused, setIsFocused] = useState(false);

  // Use custom hook to fetch myUnitList data with real-time updates only when focused
  const {
    data: myUnitList,
    isLoading,
    isFetching,
  } = useMyUnits(
    5, // location - 현장대기
    user?.user_id || 0, // userId - 로그인한 사용자 ID
    !!user, // enabled
    isFocused, // realTimeMode - 화면이 포커스되었을 때만 30초마다 자동 업데이트
  );

  // Use React Query for board data
  const {
    qnaList,
    insightList,
    noticeList,
    isFetching: isBoardsFetching,
  } = useLatestPosts();

  const formattedData = (date: any) => {
    return date ? moment(date).add(9, 'hours').format('YY.MM.DD') : '';
  };

  const goToMyUnitListScreen = () => {
    navigation.navigate('UserinfoStack', {
      screen: 'MyUnitListScreen',
    });
  };

  const goToMailBoxScreen = () => {
    navigation.navigate('UserinfoStack', {
      screen: 'MailBoxScreen',
    });
  };

  const goToFAQScreen = () => {
    navigation.navigate('HomeStack', {
      screen: 'BoardListScreen',
      params: {
        boardType: 'qna',
        title: 'Q&A',
      },
    });
  };

  const goToFAQContentScreen = (docId: string) => {
    navigation.navigate('HomeStack', {
      screen: 'DetailContentScreen',
      params: {
        boardType: 'qna',
        postId: docId,
        title: 'Q&A 상세',
      },
    });
  };

  const goToInsightScreen = () => {
    navigation.navigate('HomeStack', {
      screen: 'BoardListScreen',
      params: {
        boardType: 'insight',
        title: '사례 공유',
      },
    });
  };

  const goToNoticeScreen = () => {
    navigation.navigate('HomeStack', {
      screen: 'BoardListScreen',
      params: {
        boardType: 'notice',
        title: '공지사항',
      },
    });
  };

  const goToNoticeContentScreen = (docId: string) => {
    navigation.navigate('HomeStack', {
      screen: 'DetailContentScreen',
      params: {
        boardType: 'notice',
        postId: docId,
        title: '공지사항 상세',
      },
    });
  };

  // Handle focus state and block hardware back button
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      
      const onBackPress = () => {
        return true; // Block back button on Android and iOS
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      
      return () => {
        setIsFocused(false);
        subscription?.remove();
      };
    }, []),
  );

  const renderUserInfo = () => (
    <View style={styles.userSection}>
      <View style={styles.userGreeting}>
        <View style={styles.greetingRow}>
          <Text variant="headlineMedium" style={styles.greetingText}>
            {user?.first_name || '사용자'}님
          </Text>
          <Text variant="bodyMedium" style={styles.greetingSubtext}>
            안녕하세요!
          </Text>
        </View>
      </View>

      <View style={styles.timestampContainer}>
        <Icon
          name="clock-outline"
          size={scale(14)}
          color={COLORS.textTertiary}
          style={styles.timestampIcon}
        />
        <Text
          variant="bodySmall"
          style={styles.timestampText}
          numberOfLines={1}
        >
          {moment().format('YYYY.MM.DD HH:mm')}
        </Text>
        {isFetching && !isLoading && (
          <ActivityIndicator
            size={scale(14)}
            color={COLORS.primary}
            style={styles.loadingIndicator}
          />
        )}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={goToMyUnitListScreen}
          style={styles.statItem}
        >
          {/*<View style={styles.statHeader}>*/}
          <Text variant="bodySmall" style={styles.statLabel}>
            보유 유니트
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text variant="headlineLarge" style={styles.statValue}>
              {myUnitList?.count || 0}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.statUnit}>
            개
          </Text>
        </TouchableOpacity>

        <View style={styles.statSeparator} />

        <TouchableOpacity onPress={goToMailBoxScreen} style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>
            결재 대기
          </Text>
          <Text variant="headlineLarge" style={styles.statValue}>
            0
          </Text>
          <Text variant="bodySmall" style={styles.statUnit}>
            건
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBoardSection = (
    title: string,
    icon: string,
    list: any[],
    onMorePress: () => void,
    onItemPress: (docId: string) => void,
  ) => (
    <View style={styles.boardSection}>
      <View style={styles.boardHeader}>
        <View style={styles.boardHeaderContent}>
          <View style={styles.boardHeaderLeft}>
            <Icon
              name={icon}
              size={scale(20)}
              color={COLORS.primary}
              style={styles.boardIcon}
            />
            <Text variant="titleMedium" style={styles.boardTitle}>
              {title}
            </Text>
          </View>
          <TouchableOpacity onPress={onMorePress}>
            <MaterialIcons
              name="more-horiz"
              size={scale(20)}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {list.length === 0 ? (
        <View style={styles.emptyItem}>
          <Text variant="bodyMedium" style={styles.emptyText}>
            등록된 게시글이 없습니다.
          </Text>
        </View>
      ) : (
        list.slice(0, 3).map((item: any, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onItemPress(item.docId)}
            style={[
              styles.boardItem,
              index === list.slice(0, 3).length - 1 && styles.boardItemLast,
            ]}
          >
            <View style={styles.boardItemContent}>
              <Text
                variant="bodyLarge"
                style={styles.boardItemTitle}
                numberOfLines={1}
              >
                {item?.title}
              </Text>
              <Text variant="bodySmall" style={styles.boardItemDate}>
                {formattedData(item?.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content
          title="유니트 관리시스템"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderUserInfo()}

        {renderBoardSection(
          'Q&A',
          'help-circle-outline',
          qnaList,
          goToFAQScreen,
          goToFAQContentScreen,
        )}

        {renderBoardSection(
          '사례 공유',
          'lightbulb-outline',
          insightList,
          goToInsightScreen,
          docId =>
            navigation.navigate('HomeStack', {
              screen: 'DetailContentScreen',
              params: {
                boardType: 'insight',
                postId: docId,
                title: '사례 공유 상세',
              },
            }),
        )}

        {renderBoardSection(
          '공지사항',
          'bullhorn',
          noticeList,
          goToNoticeScreen,
          goToNoticeContentScreen,
        )}
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
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingBottom: verticalScale(20),
  },

  // User Info Section
  userSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userGreeting: {
    marginBottom: verticalScale(20),
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  greetingText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  greetingSubtext: {
    paddingTop: verticalScale(10),
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  timestampIcon: {
    marginRight: scale(4),
  },
  timestampText: {
    color: COLORS.textTertiary,
    fontSize: scale(12),
    fontWeight: '500',
    minWidth: scale(100),
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statSeparator: {
    width: 1,
    height: verticalScale(40),
    backgroundColor: COLORS.border,
    marginHorizontal: scale(20),
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  statLabel: {
    color: COLORS.textSecondary,
  },
  loadingIndicator: {
    marginLeft: scale(4),
  },
  statValue: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  statUnit: {
    color: COLORS.textTertiary,
    marginTop: verticalScale(4),
  },

  // Board Sections
  boardSection: {
    marginTop: verticalScale(8),
  },
  boardHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  boardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardIcon: {
    marginRight: scale(8),
  },
  boardTitle: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  boardItem: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  boardItemLast: {
    borderBottomWidth: 0,
  },
  boardItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardItemTitle: {
    flex: 1,
    color: COLORS.text,
    marginRight: scale(16),
  },
  boardItemDate: {
    color: COLORS.textTertiary,
  },
  emptyItem: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(24),
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen;
