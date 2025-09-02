import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  HomeStackParamList,
  RootStackParamList,
} from '../../../navigation/RootStackNavigation';
import { scale, verticalScale } from 'react-native-size-matters';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../store/AuthContext';

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
type DetailContentScreenRouteProp = RouteProp<
  HomeStackParamList,
  'DetailContentScreen'
>;
type DetailContentScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList & RootStackParamList
>;

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

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: [boardType, 'detail', postId],
    queryFn: () => getPostDetail(boardType, postId),
  });

  const getBoardColor = () => {
    return COLORS.primary; // 모든 보드 타입에 KakaoTalk 브랜드 컬러 사용
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

  if (error || !post) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction
            onPress={() => navigation.goBack()}
            iconColor={COLORS.text}
          />
          <Appbar.Content title={title} titleStyle={styles.appbarTitle} />
        </Appbar.Header>

        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={scale(64)} color={COLORS.border} />
          <Text style={styles.errorTitle}>게시글을 불러올 수 없습니다</Text>
          <Text style={styles.errorSubtitle}>
            네트워크 연결을 확인하고 다시 시도해주세요
          </Text>
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
        <Appbar.Action
          icon="pencil"
          onPress={handleEdit}
          iconColor={COLORS.textSecondary}
        />
        <Appbar.Action
          icon="delete"
          onPress={handleDelete}
          iconColor={COLORS.textSecondary}
        />
        <Appbar.Action
          icon="share"
          onPress={handleShare}
          iconColor={COLORS.textSecondary}
        />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 게시글 헤더 */}
        <View style={styles.headerSection}>
          {post.isImportant && (
            <View style={styles.importantBadge}>
              <Icon name="bullhorn" size={scale(16)} color={COLORS.primary} />
              <Text style={styles.importantText}>중요공지</Text>
            </View>
          )}

          <Text style={styles.postTitle}>{post.title}</Text>

          <View style={styles.postInfo}>
            <View style={styles.authorInfo}>
              <Icon
                name="account-circle"
                size={scale(18)}
                color={COLORS.textSecondary}
              />
              <Text style={styles.authorName}>{post.author}</Text>
            </View>

            <View style={styles.dateInfo}>
              <Text style={styles.dateText}>
                {formatDateTime(post.created_at)}
              </Text>
              {post.updated_at !== post.created_at && (
                <Text style={styles.updatedText}>(수정됨)</Text>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Icon name="eye" size={scale(14)} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{post.views}</Text>
            </View>

            <View style={styles.stat}>
              <Icon
                name="heart"
                size={scale(14)}
                color={COLORS.textSecondary}
              />
              <Text style={styles.statText}>{post.likes}</Text>
            </View>

            {boardType === 'qna' && (
              <View style={styles.stat}>
                <Icon
                  name="comment"
                  size={scale(14)}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.statText}>{post.comments}</Text>
              </View>
            )}
          </View>

          {/* 태그 (Insight 게시판용) */}
          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {post.tags.map((tag: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
        </View>

        {/* 게시글 내용 */}
        <View style={styles.contentSection}>
          <Text style={styles.postContent}>{post.content}</Text>
        </View>

        {/* 첨부파일 (향후 구현) */}
        {post.attachments && post.attachments.length > 0 && (
          <View style={styles.attachmentSection}>
            <Text style={styles.attachmentTitle}>첨부파일</Text>
            {/* TODO: 첨부파일 목록 렌더링 */}
          </View>
        )}

        {/* 액션 버튼 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Icon
              name="heart-outline"
              size={scale(20)}
              color={COLORS.primary}
            />
            <Text style={styles.actionButtonText}>좋아요 {post.likes}</Text>
          </TouchableOpacity>

          {boardType === 'qna' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                /* TODO: 답변 작성 모달 */
              }}
            >
              <Icon
                name="comment-outline"
                size={scale(20)}
                color={COLORS.primary}
              />
              <Text style={styles.actionButtonText}>답변 작성</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* QnA 댓글 섹션 (향후 구현) */}
        {boardType === 'qna' && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>답변 {post.comments}개</Text>
            <Text style={styles.commentsPlaceholder}>
              답변 기능은 추후 구현될 예정입니다.
            </Text>
          </View>
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
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
    backgroundColor: COLORS.surface,
  },
  errorTitle: {
    marginTop: verticalScale(16),
    color: COLORS.text,
    fontSize: scale(18),
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtitle: {
    marginTop: verticalScale(8),
    color: COLORS.textSecondary,
    fontSize: scale(14),
    textAlign: 'center',
  },
  headerSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  importantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    alignSelf: 'flex-start',
  },
  importantText: {
    marginLeft: scale(4),
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.primary,
  },
  postTitle: {
    fontSize: scale(20),
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: scale(28),
    marginBottom: verticalScale(16),
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
    color: COLORS.text,
    fontSize: scale(14),
    fontWeight: '500',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: COLORS.textSecondary,
    fontSize: scale(13),
  },
  updatedText: {
    marginLeft: scale(4),
    color: COLORS.textTertiary,
    fontSize: scale(12),
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
    color: COLORS.textSecondary,
    fontSize: scale(13),
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: verticalScale(8),
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    marginRight: scale(6),
    marginBottom: verticalScale(4),
  },
  tagText: {
    fontSize: scale(12),
    color: COLORS.primary,
    fontWeight: '500',
  },
  dividerContainer: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  contentSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
    marginBottom: verticalScale(8),
  },
  postContent: {
    color: COLORS.text,
    fontSize: scale(16),
    lineHeight: scale(24),
    fontWeight: '400',
  },
  attachmentSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    marginBottom: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachmentTitle: {
    color: COLORS.text,
    fontSize: scale(16),
    fontWeight: '600',
    marginBottom: verticalScale(8),
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    gap: scale(12),
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    backgroundColor: COLORS.background,
  },
  actionButtonText: {
    marginLeft: scale(6),
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.primary,
  },
  commentsSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
    marginBottom: verticalScale(20),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentsTitle: {
    color: COLORS.text,
    fontSize: scale(16),
    fontWeight: '600',
    marginBottom: verticalScale(8),
  },
  commentsPlaceholder: {
    color: COLORS.textSecondary,
    fontSize: scale(14),
    fontStyle: 'normal',
  },
});

export default DetailContentScreen;
