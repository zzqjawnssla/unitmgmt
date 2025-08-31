import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  ActivityIndicator,
  Divider,
  Chip,
  Snackbar,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList, RootStackParamList } from '../../../navigation/RootStackNavigation';
import { scale, verticalScale } from 'react-native-size-matters';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../store/AuthContext';

// Navigation Types
type DetailContentScreenRouteProp = RouteProp<HomeStackParamList, 'DetailContentScreen'>;
type DetailContentScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList & RootStackParamList>;

// Mock API 함수 (실제 API로 대체 필요)
const getPostDetail = async (boardType: string, postId: string) => {
  // TODO: 실제 API 구현 후 대체
  await new Promise(resolve => setTimeout(resolve, 1000)); // 로딩 시뮬레이션
  
  return {
    id: postId,
    title: `${boardType.toUpperCase()} 게시물 제목`,
    content: `이것은 ${boardType} 게시판의 상세 내용입니다.\n\n실제 API가 구현되면 이 부분이 실제 게시물 내용으로 대체됩니다.\n\n여러 줄의 텍스트를 포함할 수 있으며, 다양한 포맷을 지원합니다.`,
    author: '작성자명',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    views: 42,
    likes: 5,
    comments: boardType === 'qna' ? 3 : 0,
    tags: boardType === 'insight' ? ['사례공유', '문제해결', '팁'] : [],
    isImportant: boardType === 'notice',
    attachments: [],
  };
};

const DetailContentScreen: React.FC = () => {
  const navigation = useNavigation<DetailContentScreenNavigationProp>();
  const route = useRoute<DetailContentScreenRouteProp>();
  
  const { boardType, postId, title } = route.params;

  const { data: post, isLoading, error } = useQuery({
    queryKey: [boardType, 'detail', postId],
    queryFn: () => getPostDetail(boardType, postId),
  });

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

  const formatDateTime = (dateString: string) => {
    return moment(dateString).format('YYYY.MM.DD HH:mm');
  };

  const handleLike = () => {
    // TODO: 좋아요 기능 구현
    console.log('Like button pressed');
  };

  const handleShare = () => {
    // TODO: 공유 기능 구현
    console.log('Share button pressed');
  };

  const handleEdit = () => {
    navigation.navigate('UpdateContentScreen', {
      sampleData: {
        title: post?.title || '',
        content: post?.content || '',
        type: getBoardTypeKorean(),
      },
    });
  };

  const handleDelete = () => {
    // TODO: 삭제 확인 다이얼로그 및 삭제 API 호출
    console.log('Delete button pressed');
  };

  const getBoardTypeKorean = () => {
    switch (boardType) {
      case 'qna':
        return 'Q&A';
      case 'insight':
        return '사례';
      case 'notice':
        return '공지';
      default:
        return 'Q&A';
    }
  };

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

  if (error || !post) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={title} />
        </Appbar.Header>
        
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#E0E0E0" />
          <Text variant="titleMedium" style={styles.errorTitle}>
            게시글을 불러올 수 없습니다
          </Text>
          <Text variant="bodyMedium" style={styles.errorSubtitle}>
            네트워크 연결을 확인하고 다시 시도해주세요
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
        <Appbar.Action icon="pencil" onPress={handleEdit} />
        <Appbar.Action icon="delete" onPress={handleDelete} />
        <Appbar.Action icon="share" onPress={handleShare} />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 게시글 헤더 */}
        <Card style={styles.headerCard}>
          <Card.Content>
            {post.isImportant && (
              <View style={styles.importantBadge}>
                <Icon name="bullhorn" size={16} color="#FF5722" />
                <Text style={[styles.importantText, { color: getBoardColor() }]}>
                  중요공지
                </Text>
              </View>
            )}
            
            <Text variant="headlineSmall" style={styles.postTitle}>
              {post.title}
            </Text>
            
            <View style={styles.postInfo}>
              <View style={styles.authorInfo}>
                <Icon name="account-circle" size={20} color="#666" />
                <Text variant="bodyMedium" style={styles.authorName}>
                  {post.author}
                </Text>
              </View>
              
              <View style={styles.dateInfo}>
                <Text variant="bodySmall" style={styles.dateText}>
                  {formatDateTime(post.created_at)}
                </Text>
                {post.updated_at !== post.created_at && (
                  <Text variant="bodySmall" style={styles.updatedText}>
                    (수정됨)
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Icon name="eye" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.statText}>
                  {post.views}
                </Text>
              </View>
              
              <View style={styles.stat}>
                <Icon name="heart" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.statText}>
                  {post.likes}
                </Text>
              </View>
              
              {boardType === 'qna' && (
                <View style={styles.stat}>
                  <Icon name="comment" size={16} color="#666" />
                  <Text variant="bodySmall" style={styles.statText}>
                    {post.comments}
                  </Text>
                </View>
              )}
            </View>

            {/* 태그 (Insight 게시판용) */}
            {post.tags && post.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {post.tags.map((tag: string, index: number) => (
                  <Chip
                    key={index}
                    mode="outlined"
                    textStyle={styles.tagText}
                    style={[styles.tag, { borderColor: getBoardColor() }]}
                  >
                    {tag}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        {/* 게시글 내용 */}
        <Card style={styles.contentCard}>
          <Card.Content>
            <Text variant="bodyLarge" style={styles.postContent}>
              {post.content}
            </Text>
          </Card.Content>
        </Card>

        {/* 첨부파일 (향후 구현) */}
        {post.attachments && post.attachments.length > 0 && (
          <Card style={styles.attachmentCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.attachmentTitle}>
                첨부파일
              </Text>
              {/* TODO: 첨부파일 목록 렌더링 */}
            </Card.Content>
          </Card>
        )}

        {/* 액션 버튼 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: getBoardColor() }]}
            onPress={handleLike}
          >
            <Icon name="heart-outline" size={20} color={getBoardColor()} />
            <Text style={[styles.actionButtonText, { color: getBoardColor() }]}>
              좋아요 {post.likes}
            </Text>
          </TouchableOpacity>
          
          {boardType === 'qna' && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: getBoardColor() }]}
              onPress={() => {/* TODO: 답변 작성 모달 */}}
            >
              <Icon name="comment-outline" size={20} color={getBoardColor()} />
              <Text style={[styles.actionButtonText, { color: getBoardColor() }]}>
                답변 작성
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* QnA 댓글 섹션 (향후 구현) */}
        {boardType === 'qna' && (
          <Card style={styles.commentsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.commentsTitle}>
                답변 {post.comments}개
              </Text>
              <Text variant="bodyMedium" style={styles.commentsPlaceholder}>
                답변 기능은 추후 구현될 예정입니다.
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
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
    paddingTop: verticalScale(8),
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  errorTitle: {
    marginTop: verticalScale(16),
    color: '#666666',
    textAlign: 'center',
  },
  errorSubtitle: {
    marginTop: verticalScale(8),
    color: '#999999',
    textAlign: 'center',
  },
  headerCard: {
    marginBottom: verticalScale(8),
    elevation: 2,
  },
  importantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  importantText: {
    marginLeft: scale(4),
    fontSize: scale(12),
    fontWeight: '700',
  },
  postTitle: {
    fontWeight: '700',
    color: '#333333',
    lineHeight: 28,
    marginBottom: verticalScale(12),
  },
  postInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    marginLeft: scale(6),
    color: '#333333',
    fontWeight: '600',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#666666',
  },
  updatedText: {
    marginLeft: scale(4),
    color: '#999999',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(8),
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scale(16),
  },
  statText: {
    marginLeft: scale(4),
    color: '#666666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: verticalScale(8),
  },
  tag: {
    marginRight: scale(6),
    marginBottom: verticalScale(4),
  },
  tagText: {
    fontSize: scale(12),
  },
  divider: {
    marginVertical: verticalScale(8),
  },
  contentCard: {
    marginBottom: verticalScale(16),
    elevation: 1,
  },
  postContent: {
    color: '#333333',
    lineHeight: 24,
  },
  attachmentCard: {
    marginBottom: verticalScale(16),
    elevation: 1,
  },
  attachmentTitle: {
    color: '#333333',
    marginBottom: verticalScale(8),
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: verticalScale(16),
    gap: scale(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    marginLeft: scale(6),
    fontWeight: '600',
  },
  commentsCard: {
    marginBottom: verticalScale(20),
    elevation: 1,
  },
  commentsTitle: {
    color: '#333333',
    marginBottom: verticalScale(8),
  },
  commentsPlaceholder: {
    color: '#999999',
    fontStyle: 'italic',
  },
});

export default DetailContentScreen;