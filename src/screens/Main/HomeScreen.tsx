import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Surface, Text, Card, useTheme, Appbar } from 'react-native-paper';
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

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Use custom hook to fetch myUnitList data with real-time updates
  const {
    data: myUnitList,
    isLoading,
    isFetching,
  } = useMyUnits(
    5, // location - 현장대기
    user?.user_id || 0, // userId - 로그인한 사용자 ID
    !!user, // enabled
    true, // realTimeMode - 30초마다 자동 업데이트
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
      screen: 'MyUnitListScreen'
    });
  };

  const goToMailBoxScreen = () => {
    navigation.navigate('UserinfoStack', {
      screen: 'MailBoxScreen'
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

  // No need to manually fetch data - React Query handles it automatically

  // Block hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        return true; // Block back button on Android and iOS
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription?.remove();
    }, []),
  );

  // React Query automatically handles data fetching - no need for manual useFocusEffect

  const renderUserInfo = () => (
    <View style={styles.sectionContainer}>
      <Text variant="headlineMedium" style={styles.greeting}>
        {user?.first_name || '사용자'}님, 안녕하세요!
      </Text>

      <View style={styles.cardRow}>
        <TouchableOpacity
          onPress={goToMyUnitListScreen}
          style={[styles.infoCard, { borderColor: theme.colors.primary }]}
        >
          <View style={styles.cardHeader}>
            <Text
              variant="titleMedium"
              style={[styles.cardTitle, { color: theme.colors.primary }]}
            >
              보유 유니트
            </Text>
            {isFetching && !isLoading && (
              <ActivityIndicator
                size={16}
                color={theme.colors.primary}
                style={styles.updateIndicator}
              />
            )}
          </View>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <Text variant="headlineLarge" style={styles.cardValue}>
              {myUnitList?.count || 0} 개
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToMailBoxScreen}
          style={[styles.infoCard, { borderColor: theme.colors.primary }]}
        >
          <Text
            variant="titleMedium"
            style={[styles.cardTitle, { color: theme.colors.primary }]}
          >
            결재 대기
          </Text>
          <Text variant="headlineLarge" style={styles.cardValue}>
            0 건
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCommunity = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Icon
            name="account-question"
            size={24}
            color={theme.colors.primary}
            style={styles.headerIcon}
          />
          <Text
            variant="titleLarge"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
          >
            Q&A
          </Text>
        </View>
        <TouchableOpacity onPress={goToFAQScreen}>
          <MaterialIcons
            name="more-horiz"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      {qnaList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              등록된 게시글이 없습니다.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        qnaList.map((item: any, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToFAQContentScreen(item.docId)}
          >
            <Card style={styles.contentCard}>
              <Card.Content>
                <View style={styles.contentRow}>
                  <Text
                    variant="bodyLarge"
                    style={styles.contentTitle}
                    numberOfLines={1}
                  >
                    {item?.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.contentDate}>
                    {formattedData(item?.created_at)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderInsight = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Icon
            name="note-search-outline"
            size={24}
            color={theme.colors.primary}
            style={styles.headerIcon}
          />
          <Text
            variant="titleLarge"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
          >
            사례 공유
          </Text>
        </View>
        <TouchableOpacity onPress={goToInsightScreen}>
          <MaterialIcons
            name="more-horiz"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      {insightList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              등록된 게시글이 없습니다.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        insightList.map((item: any, index) => (
          <TouchableOpacity
            key={index}
            onPress={() =>
              navigation.navigate('HomeStack', {
                screen: 'DetailContentScreen',
                params: {
                  boardType: 'insight',
                  postId: item.docId || item.id,
                  title: '사례 공유 상세',
                },
              })
            }
          >
            <Card style={styles.contentCard}>
              <Card.Content>
                <View style={styles.contentRow}>
                  <Text
                    variant="bodyLarge"
                    style={styles.contentTitle}
                    numberOfLines={1}
                  >
                    {item?.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.contentDate}>
                    {formattedData(item?.created_at)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderNotice = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name="announcement"
            size={24}
            color={theme.colors.primary}
            style={styles.headerIcon}
          />
          <Text
            variant="titleLarge"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
          >
            공지사항
          </Text>
        </View>
        <TouchableOpacity onPress={goToNoticeScreen}>
          <MaterialIcons
            name="more-horiz"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      {noticeList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              등록된 게시글이 없습니다.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        noticeList.map((item: any, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToNoticeContentScreen(item?.docId)}
          >
            <Card style={styles.contentCard}>
              <Card.Content>
                <View style={styles.contentRow}>
                  <Text
                    variant="bodyLarge"
                    style={styles.contentTitle}
                    numberOfLines={1}
                  >
                    {item?.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.contentDate}>
                    {formattedData(item?.created_at)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="단위 관리 시스템" />
        <Appbar.Action icon="bell-outline" onPress={() => {}} />
        <Appbar.Action
          icon="logout"
          onPress={() => {
            console.log('Logout pressed - clearing userData and tokens');
            logout();
          }}
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderUserInfo()}
        {renderCommunity()}
        {renderInsight()}
        {renderNotice()}
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
  sectionContainer: {
    marginBottom: verticalScale(24),
  },
  greeting: {
    fontWeight: '700',
    color: '#505050',
    marginBottom: verticalScale(16),
  },
  cardRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderRadius: scale(10),
    padding: scale(16),
    minHeight: verticalScale(80),
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  cardTitle: {
    fontWeight: '700',
  },
  updateIndicator: {
    marginLeft: scale(4),
  },
  cardValue: {
    fontWeight: '700',
    textAlign: 'right',
    color: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: scale(8),
  },
  sectionTitle: {
    fontWeight: '700',
  },
  emptyCard: {
    marginBottom: verticalScale(8),
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
  },
  contentCard: {
    marginBottom: verticalScale(8),
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentTitle: {
    flex: 1,
    marginRight: scale(12),
  },
  contentDate: {
    color: '#999999',
    fontSize: scale(12),
  },
});

export default HomeScreen;
