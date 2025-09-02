import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import React from 'react';
import { ActionButtons } from './ActionButtons';
import { Text } from 'react-native-paper';
import { useAuth } from '../../store/AuthContext.tsx';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface UnitInfoProps {
  result?: {
    id: string;
    skt_barcode: string;
    unit_serial: string;
    detail_typename: string;
    sub_type: string;
    main_typename: string;
    manufacturer: string;
    generation: string;
    biz_type: string;
    is_required_testbed?: boolean;
    updated_at: string;
    last_manage_history?: {
      user: string;
      user_first_name: string;
      username: string;
      user_region: string;
      user_team: string;
      unit_state: string;
      state_desc: string;
      unit_movement: string;
      movement_desc: string;
      unit_movement_desc: string;
      location: string;
      context_type: string;
      object_id: string;
      location_desc: string;
      location_context_instance?: {
        id: number;
        zp_type: string;
        zp_code: string;
        t_code: string;
        zp_name: string;
        zp_manage_region: string;
        zp_manage_team: string;
        warehouse_name: string;
        warehouse_type: string;
        warehouse_manage_team: string;
        operating_company: string;
        is_use: boolean;
        vehicle_number: string;
        vehicle_type: string;
        vehicle_manage_team: string;
      };
      created_at: string;
    };
  } | null;
}

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
  success: '#4CAF50',
  warning: '#FF9500',
  error: '#F44336',
};

export const UnitInfo: React.FC<UnitInfoProps> = ({ result }) => {
  const { user } = useAuth();

  if (!result) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={scale(48)}
          color={COLORS.textTertiary}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyText}>유니트 정보를 불러올 수 없습니다</Text>
        <Text style={styles.emptySubtext}>잠시 후 다시 시도해 주세요</Text>
      </View>
    );
  }

  const shouldShowActionButtons = () => {
    const movement = result?.last_manage_history?.unit_movement;
    // const currentLocation =
    //   result?.last_manage_history?.location_context_instance;
    //
    // if (currentLocation === user?.user) {
    //   return false;
    // }

    // 조건이 없는 케이스들
    if (
      movement === '창고출고' ||
      movement === '탈장' ||
      movement === '수리출고' ||
      movement === '대기'
    ) {
      return true;
    }

    // 창고 입고의 경우
    if (movement === '창고입고') {
      return (
        result?.last_manage_history?.location_context_instance
          ?.warehouse_manage_team === user?.team
      );
    }

    // 장착의 경우
    if (movement === '장착') {
      return (
        result?.last_manage_history?.location_context_instance
          ?.zp_manage_team === user?.team ||
        result?.last_manage_history?.location_context_instance
          ?.vehicle_manage_team === user?.team
      );
    }

    return false;
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
      {/* 유니트 기본 정보 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="information-outline"
            size={scale(18)}
            color={COLORS.primary}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>기본 정보</Text>
        </View>

        <View style={styles.sectionContent}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name="devices"
              size={scale(20)}
              color={COLORS.primary}
              style={styles.titleIcon}
            />
            <Text style={styles.unitTitle}>{result?.detail_typename}</Text>
          </View>

          <View style={styles.infoGroup}>
            <View style={styles.contentsContainer}>
              <Text style={styles.label}>제조사</Text>
              <Text style={styles.value}>{result?.manufacturer}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.contentsContainer}>
              <Text style={styles.label}>구분 · 타입</Text>
              <Text style={styles.value}>
                {result?.main_typename} · {result?.sub_type}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.contentsContainer}>
              <Text style={styles.label}>T/B 대상여부</Text>
              <View style={styles.badgeContainer}>
                <Text
                  style={[
                    styles.badge,
                    result?.is_required_testbed
                      ? styles.badgeRequired
                      : styles.badgeNotRequired,
                  ]}
                >
                  {result?.is_required_testbed ? '대상' : '비대상'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 식별 정보 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="barcode"
            size={scale(18)}
            color={COLORS.primary}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>식별 정보</Text>
        </View>

        <View style={styles.sectionContent}>
          <View style={styles.infoGroup}>
            <View style={styles.contentsContainer}>
              <Text style={styles.label}>SKT 바코드</Text>
              <Text style={[styles.value, styles.codeValue]}>
                {result?.skt_barcode}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.contentsContainer}>
              <Text style={styles.label}>제조사 S/N</Text>
              <Text style={[styles.value, styles.codeValue]}>
                {result?.unit_serial}
              </Text>
            </View>
          </View>
        </View>
      </View>
      {/* 위치 정보 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={scale(18)}
            color={COLORS.primary}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>위치 정보</Text>
        </View>

        <View style={styles.sectionContent}>
          {result?.last_manage_history?.location === '국소' && (
            <View style={styles.infoGroup}>
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>통합시설코드</Text>
                <Text style={[styles.value, styles.codeValue]}>
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.zp_code
                  }
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>현재 위치</Text>
                <Text
                  style={[styles.value, styles.locationValue]}
                  numberOfLines={2}
                  ellipsizeMode={'tail'}
                >
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.zp_name
                  }
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>관리 부서</Text>
                <Text style={styles.value}>
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.zp_manage_team
                  }
                </Text>
              </View>
            </View>
          )}

          {result?.last_manage_history?.location === '전진배치(집/중/통)' && (
            <View style={styles.infoGroup}>
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>통합시설코드</Text>
                <Text style={[styles.value, styles.codeValue]}>
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.zp_code
                  }
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>현재 위치</Text>
                <Text
                  style={[styles.value, styles.locationValue]}
                  numberOfLines={2}
                  ellipsizeMode={'tail'}
                >
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.zp_name
                  }
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>관리 부서</Text>
                <Text style={styles.value}>
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.zp_manage_team
                  }
                </Text>
              </View>
            </View>
          )}

          {result?.last_manage_history?.location === '창고' && (
            <View style={styles.infoGroup}>
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>통합시설코드</Text>
                <Text style={[styles.value, styles.codeValue]}>
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.zp_code
                  }
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>현재 위치</Text>
                <Text
                  style={[styles.value, styles.locationValue]}
                  numberOfLines={2}
                  ellipsizeMode={'tail'}
                >
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.warehouse_name
                  }
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>관리 부서</Text>
                <Text style={styles.value}>
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.warehouse_manage_team
                  }
                </Text>
              </View>
            </View>
          )}

          {result?.last_manage_history?.location === '차량보관' && (
            <View style={styles.infoGroup}>
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>현재 위치</Text>
                <Text
                  style={[styles.value, styles.locationValue]}
                  numberOfLines={2}
                  ellipsizeMode={'tail'}
                >
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.vehicle_number
                  }
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contentsContainer}>
                <Text style={styles.label}>관리 부서</Text>
                <Text style={styles.value}>
                  {
                    result?.last_manage_history?.location_context_instance
                      ?.vehicle_manage_team
                  }
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 상태 정보 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="clipboard-list-outline"
            size={scale(18)}
            color={COLORS.primary}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>상태 정보</Text>
        </View>

        <View style={styles.sectionContent}>
          <View style={styles.infoGroup}>
            <View style={styles.contentsContainer}>
              <Text style={styles.label}>이동유형(상태)</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                  {result?.last_manage_history?.unit_movement}
                </Text>
                <Text style={styles.stateText}>
                  ({result?.last_manage_history?.unit_state})
                </Text>
              </View>
            </View>

            {(result?.last_manage_history?.unit_movement_desc !== '' ||
              result?.last_manage_history?.state_desc !== '') && (
              <>
                <View style={styles.separator} />
                <View style={styles.reasonSection}>
                  <Text style={styles.label}>이동 사유</Text>
                  <View style={styles.reasonBox}>
                    {result?.last_manage_history?.state_desc !== '' && (
                      <Text style={styles.reasonText}>
                        {result?.last_manage_history?.state_desc}
                      </Text>
                    )}
                    {result?.last_manage_history?.movement_desc !== '' && (
                      <Text style={styles.reasonText}>
                        {result?.last_manage_history?.movement_desc}
                      </Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/*{shouldShowActionButtons() ? <ActionButtons result={result} /> : null}*/}
      <ActionButtons result={result} />

      {/*현재버전에서는 비활성화*/}
      {/*<SubActionButtons result={result} />*/}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  section: {
    backgroundColor: COLORS.background,
    marginBottom: verticalScale(8),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIcon: {
    marginRight: scale(8),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionContent: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleIcon: {
    marginRight: scale(12),
  },
  unitTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    lineHeight: scale(26),
  },
  infoGroup: {
    backgroundColor: COLORS.background,
  },
  contentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    // minHeight: verticalScale(30),
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 0,
  },
  label: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 0.4,
  },
  value: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.text,
    flex: 0.6,
    textAlign: 'right',
  },
  codeValue: {
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  locationValue: {
    textAlign: 'right',
    lineHeight: scale(18),
  },
  badgeContainer: {
    flex: 0.6,
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    fontSize: scale(12),
    fontWeight: '600',
    overflow: 'hidden',
  },
  badgeRequired: {
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primary,
  },
  badgeNotRequired: {
    backgroundColor: COLORS.surface,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    flex: 0.6,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.primary,
  },
  stateText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: verticalScale(2),
  },
  reasonSection: {
    paddingTop: verticalScale(12),
  },
  reasonBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: scale(8),
    padding: scale(16),
    marginTop: verticalScale(8),
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  reasonText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: scale(20),
    marginBottom: verticalScale(4),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(40),
    backgroundColor: COLORS.surface,
  },
  emptyIcon: {
    marginBottom: verticalScale(16),
  },
  emptyText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  emptySubtext: {
    fontSize: scale(14),
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
