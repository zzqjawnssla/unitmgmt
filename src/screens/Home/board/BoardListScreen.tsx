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
  Card,
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
import { useQnAList, useInsightList, useNoticeList } from '../../../hooks/useSelectList';

// Navigation Types
type BoardListScreenRouteProp = RouteProp<HomeStackParamList, 'BoardListScreen'>;
type BoardListScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

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
    switch (boardType) {
      case 'qna':
        return '#2196F3';
      case 'insight':
        return '#4CAF50';
      case 'notice':
        return '#FF5722';
      default:
        return '#F47725';
    }
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
    <TouchableOpacity onPress={() => handlePostPress(item.id || item.docId)}>
      <Card style={styles.postCard}>
        <Card.Content>
          <View style={styles.postHeader}>
            <Text variant="titleMedium" style={styles.postTitle} numberOfLines={2}>
              {item.title || '제목 없음'}
            </Text>
            <View style={styles.postMeta}>
              <Text variant="bodySmall" style={styles.metaText}>
                {item.author || '작성자'}
              </Text>
              <Text variant="bodySmall" style={styles.metaText}>
                {formatDate(item.created_at || new Date().toISOString())}
              </Text>
            </View>
          </View>
          
          {item.content && (
            <Text variant="bodyMedium" style={styles.postContent} numberOfLines={2}>
              {item.content}
            </Text>
          )}

          <View style={styles.postFooter}>
            <View style={styles.postStats}>
              <Icon name="eye" size={16} color="#666" />
              <Text variant="bodySmall" style={styles.statText}>
                {item.views || 0}
              </Text>
              {boardType === 'qna' && (
                <>
                  <Icon name="comment" size={16} color="#666" style={styles.statIcon} />
                  <Text variant="bodySmall" style={styles.statText}>
                    {item.comments || 0}
                  </Text>
                </>
              )}
            </View>
            {item.isNew && (
              <View style={[styles.newBadge, { backgroundColor: getBoardColor() }]}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name={getBoardIcon()} size={64} color="#E0E0E0" />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        등록된 게시글이 없습니다
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        첫 번째 게시글을 작성해보세요
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={title} />
        </Appbar.Header>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F47725" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            게시글을 불러오는 중...
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title} />
        {isFetching && (
          <ActivityIndicator size={20} color="#F47725" style={styles.headerLoader} />
        )}
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="게시글 검색..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={getBoardColor()}
        />

        <FlatList
          data={data?.results || []}
          renderItem={renderPost}
          keyExtractor={(item, index) => item.id?.toString() || item.docId || index.toString()}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => {
                setPage(1);
                refetch();
              }}
              colors={[getBoardColor()]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: getBoardColor() }]}
        onPress={handleCreatePost}
        label="새 게시글"
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  searchBar: {
    marginVertical: verticalScale(12),
    elevation: 2,
  },
  headerLoader: {
    marginRight: scale(8),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(16),
    color: '#666666',
  },
  listContainer: {
    paddingBottom: verticalScale(20),
  },
  postCard: {
    marginBottom: verticalScale(8),
    elevation: 1,
  },
  postHeader: {
    marginBottom: verticalScale(8),
  },
  postTitle: {
    fontWeight: '700',
    color: '#333333',
    marginBottom: verticalScale(4),
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#666666',
    fontSize: scale(12),
  },
  postContent: {
    color: '#555555',
    lineHeight: 20,
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
    color: '#666666',
  },
  newBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: 4,
  },
  newBadgeText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(100),
  },
  emptyTitle: {
    marginTop: verticalScale(16),
    color: '#666666',
  },
  emptySubtitle: {
    marginTop: verticalScale(8),
    color: '#999999',
  },
  fab: {
    position: 'absolute',
    right: scale(16),
    bottom: verticalScale(16),
  },
});

export default BoardListScreen;