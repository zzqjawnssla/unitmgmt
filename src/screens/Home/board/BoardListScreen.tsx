import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  ActivityIndicator,
  Searchbar,
  FAB,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/RootStackNavigation';
import { scale, verticalScale } from 'react-native-size-matters';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useQnAList,
  useInsightList,
  useNoticeList,
} from '../../../hooks/useSelectList';

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F9F9F9',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  divider: '#F0F0F0',
};

// Navigation Types
type BoardListScreenRouteProp = RouteProp<
  HomeStackParamList,
  'BoardListScreen'
>;
type BoardListScreenNavigationProp =
  NativeStackNavigationProp<HomeStackParamList>;

const BoardListScreen: React.FC = () => {
  const navigation = useNavigation<BoardListScreenNavigationProp>();
  const route = useRoute<BoardListScreenRouteProp>();

  const { boardType, title } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // 게시판 타입별로 적절한 훅 사용
  const getHookByType = () => {
    switch (boardType) {
      case 'qna':
        return useQnAList(page, 20);
      case 'insight':
        return useInsightList(page, 20);
      case 'notice':
        return useNoticeList(page, 20);
      default:
        return useQnAList(page, 20);
    }
  };

  const { data, isLoading, isFetching, refetch } = getHookByType();

  const getBoardIcon = () => {
    switch (boardType) {
      case 'qna':
        return 'account-question';
      case 'insight':
        return 'note-search-outline';
      case 'notice':
        return 'bullhorn';
      default:
        return 'forum';
    }
  };

  const getBoardColor = () => {
    return COLORS.primary; // 모든 보드 타입에 KakaoTalk 브랜드 컬러 사용
  };

  const formatDate = (dateString: string) => {
    return moment(dateString).format('MM.DD');
  };

  const handlePostPress = (postId: string) => {
    navigation.navigate('DetailContentScreen', {
      boardType,
      postId,
      title: `${title} 상세`,
    });
  };

  const handleCreatePost = () => {
    navigation.navigate('CreateContentScreen');
  };

  const renderPost = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handlePostPress(item.id || item.docId)}
      style={styles.postCard}
      activeOpacity={0.7}
    >
      <View style={styles.postHeader}>
        <Text style={styles.postTitle} numberOfLines={2}>
          {item.title || '제목 없음'}
        </Text>
        <View style={styles.postMeta}>
          <Text style={styles.metaText}>{item.author || '작성자'}</Text>
          <Text style={styles.metaText}>
            {formatDate(item.created_at || new Date().toISOString())}
          </Text>
        </View>
      </View>

      {item.content && (
        <Text style={styles.postContent} numberOfLines={2}>
          {item.content}
        </Text>
      )}

      <View style={styles.postFooter}>
        <View style={styles.postStats}>
          <Icon name="eye" size={scale(14)} color={COLORS.textSecondary} />
          <Text style={styles.statText}>{item.views || 0}</Text>
          {boardType === 'qna' && (
            <>
              <Icon
                name="comment"
                size={scale(14)}
                color={COLORS.textSecondary}
                style={styles.statIcon}
              />
              <Text style={styles.statText}>{item.comments || 0}</Text>
            </>
          )}
        </View>
        {item.isNew && (
          <View style={[styles.newBadge, { backgroundColor: getBoardColor() }]}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name={getBoardIcon()} size={scale(64)} color={COLORS.border} />
      <Text style={styles.emptyTitle}>등록된 게시글이 없습니다</Text>
      <Text style={styles.emptySubtitle}>첫 번째 게시글을 작성해보세요</Text>
    </View>
  );

  if (isLoading) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction
            onPress={() => navigation.goBack()}
            iconColor={COLORS.text}
          />
          <Appbar.Content title={title} titleStyle={styles.appbarTitle} />
        </Appbar.Header>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>게시글을 불러오는 중...</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          iconColor={COLORS.text}
        />
        <Appbar.Content title={title} titleStyle={styles.appbarTitle} />
        {isFetching && (
          <ActivityIndicator
            size={20}
            color={COLORS.primary}
            style={styles.headerLoader}
          />
        )}
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="게시글 검색..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={COLORS.primary}
          theme={{
            colors: {
              primary: COLORS.primary,
              onSurfaceVariant: COLORS.textSecondary,
            },
          }}
        />

        <FlatList
          data={data?.results || []}
          renderItem={renderPost}
          keyExtractor={(item, index) =>
            item.id?.toString() || item.docId || index.toString()
          }
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => {
                setPage(1);
                refetch();
              }}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      <FAB
        icon="pencil"
        style={[styles.fab, { backgroundColor: COLORS.primary }]}
        onPress={handleCreatePost}
        // label="새 게시글"
      />
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
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(20),
  },
  searchBar: {
    marginVertical: verticalScale(16),
    elevation: 0,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(12),
  },
  headerLoader: {
    marginRight: scale(8),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    marginTop: verticalScale(16),
    color: COLORS.textSecondary,
    fontSize: scale(16),
  },
  listContainer: {
    paddingBottom: verticalScale(100),
  },
  postCard: {
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scale(16),
    marginBottom: verticalScale(8),
  },
  postHeader: {
    marginBottom: verticalScale(12),
  },
  postTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(8),
    lineHeight: scale(22),
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: scale(13),
  },
  postContent: {
    color: COLORS.textSecondary,
    fontSize: scale(14),
    lineHeight: scale(20),
    marginBottom: verticalScale(12),
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginLeft: scale(12),
  },
  statText: {
    marginLeft: scale(4),
    color: COLORS.textSecondary,
    fontSize: scale(13),
  },
  newBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  newBadgeText: {
    color: COLORS.background,
    fontSize: scale(10),
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(100),
  },
  emptyTitle: {
    marginTop: verticalScale(16),
    color: COLORS.text,
    fontSize: scale(18),
    fontWeight: '600',
  },
  emptySubtitle: {
    marginTop: verticalScale(8),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  fab: {
    position: 'absolute',
    right: scale(20),
    bottom: verticalScale(20),
    borderRadius: scale(50),
  },
});

export default BoardListScreen;
