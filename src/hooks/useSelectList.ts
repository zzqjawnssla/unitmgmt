import { useQuery } from '@tanstack/react-query';
import {
  getLocationList,
  getRegionList,
  getTeamList,
  getUnitDetailTypeList,
  getUnitLocationHistory,
  getUnitStateList,
  getUnitSubTypeList,
} from '../services/api/api';

// 게시판 API 함수들 (아직 구현되지 않았다면 임시로 mock)
const getQnAList = async (page: number = 1, limit: number = 10) => {
  // TODO: 실제 API 구현 후 대체
  return {
    count: 0,
    results: [],
    next: null,
    previous: null,
  };
};

const getInsightList = async (page: number = 1, limit: number = 10) => {
  // TODO: 실제 API 구현 후 대체
  return {
    count: 0,
    results: [],
    next: null,
    previous: null,
  };
};

const getNoticeList = async (page: number = 1, limit: number = 10) => {
  // TODO: 실제 API 구현 후 대체
  return {
    count: 0,
    results: [],
    next: null,
    previous: null,
  };
};

// 정적 참조 데이터 - 오래 캐시
const STATIC_DATA_CONFIG = {
  staleTime: 60 * 60 * 1000, // 1 hour
  gcTime: 24 * 60 * 60 * 1000, // 24 hours
};

// 지역 목록
export const useRegions = () => {
  return useQuery({
    queryKey: ['regions'],
    queryFn: getRegionList,
    ...STATIC_DATA_CONFIG,
  });
};

// 팀 목록
export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: getTeamList,
    ...STATIC_DATA_CONFIG,
  });
};

// 유닛 서브타입 목록
export const useSubTypes = () => {
  return useQuery({
    queryKey: ['subtypes'],
    queryFn: getUnitSubTypeList,
    ...STATIC_DATA_CONFIG,
  });
};

// 유닛 상세타입 목록
export const useDetailTypes = () => {
  return useQuery({
    queryKey: ['detailTypes'],
    queryFn: getUnitDetailTypeList,
    ...STATIC_DATA_CONFIG,
  });
};

// 위치 목록
export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: getLocationList,
    staleTime: 30 * 60 * 1000, // 30 minutes - 준정적 데이터
    gcTime: 4 * 60 * 60 * 1000, // 4 hours
  });
};

// 유닛 상태 목록
export const useUnitStates = () => {
  return useQuery({
    queryKey: ['unitStates'],
    queryFn: getUnitStateList,
    ...STATIC_DATA_CONFIG,
  });
};

// 내 유닛 목록 (실시간성 필요 - 자주 변경되는 데이터)
export const useMyUnits = (
  location: number = 5,
  userId: number = 0,
  enabled: boolean = true,
  realTimeMode: boolean = false, // 실시간 모드 옵션
) => {
  return useQuery({
    queryKey: ['myUnits', location, userId],
    queryFn: () => getUnitLocationHistory(location, userId),
    // staleTime: 0, // 항상 stale - 매번 백그라운드에서 최신 데이터 fetch
    staleTime: 5 * 60 * 1000, // 임시
    gcTime: 5 * 60 * 1000, // 5분만 캐시 보관 (메모리 절약)
    refetchOnMount: true, // 컴포넌트 마운트시 항상 refetch
    refetchOnWindowFocus: true, // 앱이 포커스될 때 refetch
    refetchOnReconnect: true, // 네트워크 재연결시 refetch
    refetchInterval: realTimeMode ? 30 * 1000 : false, // 실시간 모드시 30초마다 polling
    refetchIntervalInBackground: false, // 백그라운드에서는 polling 안함 (배터리 절약)
    enabled,
  });
};

// ===================
// 게시판 관련 훅들
// ===================

// QnA 게시판 (중간 실시간성)
export const useQnAList = (
  page: number = 1,
  limit: number = 10,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ['qna', page, limit],
    queryFn: () => getQnAList(page, limit),
    staleTime: 5 * 60 * 1000, // 5분 - 새로운 질문/답변 체크
    gcTime: 30 * 60 * 1000, // 30분 캐시 보관
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled,
  });
};

// Insight 게시판 (낮은 실시간성)
export const useInsightList = (
  page: number = 1,
  limit: number = 10,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ['insight', page, limit],
    queryFn: () => getInsightList(page, limit),
    staleTime: 15 * 60 * 1000, // 15분 - 사례 공유는 자주 안바뀜
    gcTime: 60 * 60 * 1000, // 1시간 캐시 보관
    refetchOnMount: false, // 마운트시 자동 refetch 안함
    refetchOnWindowFocus: false,
    enabled,
  });
};

// Notice 게시판 (높은 실시간성)
export const useNoticeList = (
  page: number = 1,
  limit: number = 10,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ['notice', page, limit],
    queryFn: () => getNoticeList(page, limit),
    staleTime: 0, // 항상 최신 공지 확인
    gcTime: 10 * 60 * 1000, // 10분 캐시 보관
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 5 * 60 * 1000, // 5분마다 새 공지 체크
    refetchIntervalInBackground: false,
    enabled,
  });
};

// HomeScreen용 - 최신 게시물 몇 개만 가져오는 훅
export const useLatestPosts = () => {
  const qna = useQnAList(1, 3); // 최신 3개만
  const insight = useInsightList(1, 3); // 최신 3개만
  const notice = useNoticeList(1, 3); // 최신 3개만

  return {
    qnaList: qna.data?.results || [],
    insightList: insight.data?.results || [],
    noticeList: notice.data?.results || [],
    isLoading: qna.isLoading || insight.isLoading || notice.isLoading,
    isFetching: qna.isFetching || insight.isFetching || notice.isFetching,
  };
};

// 여러 선택 목록을 한번에 가져오는 훅 (필요시 사용)
export const useSelectLists = () => {
  const regions = useRegions();
  const teams = useTeams();
  const subTypes = useSubTypes();
  const detailTypes = useDetailTypes();
  const locations = useLocations();
  const unitStates = useUnitStates();

  const isLoading = [
    regions,
    teams,
    subTypes,
    detailTypes,
    locations,
    unitStates,
  ].some(query => query.isLoading);

  const hasError = [
    regions,
    teams,
    subTypes,
    detailTypes,
    locations,
    unitStates,
  ].some(query => query.isError);

  return {
    regions: regions.data,
    teams: teams.data,
    subTypes: subTypes.data,
    detailTypes: detailTypes.data,
    locations: locations.data,
    unitStates: unitStates.data,
    isLoading,
    hasError,
  };
};
