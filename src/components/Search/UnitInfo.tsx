import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import React from 'react';
import { ActionButtons } from './ActionButtons';
import { Text } from 'react-native-paper';
import { useAuth } from '../../store/AuthContext.tsx';

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

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  textSecondary: '#666666',
};

export const UnitInfo: React.FC<UnitInfoProps> = ({ result }) => {
  const { user } = useAuth();

  if (!result) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(20) }}>
        <Text variant="bodyLarge" style={{ color: '#666666' }}>
          유니트 정보를 불러올 수 없습니다.
        </Text>
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
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: '#F0F0F0',
          padding: scale(16),
          marginBottom: verticalScale(8),
          borderRadius: 10,
        }}
      >
        <View>
          <View style={{ paddingHorizontal: scale(12) }}>
            <View style={styles.contentsContainer}>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                {result?.detail_typename}
              </Text>
            </View>
            <View style={{ marginVertical: verticalScale(8) }}>
              <View style={styles.contentsContainer}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: BRAND_COLORS.textSecondary,
                    fontWeight: 'bold',
                  }}
                >
                  제조사
                </Text>
                <Text
                  variant="titleSmall"
                  style={{ color: 'black', fontWeight: 'bold' }}
                >
                  {result?.manufacturer}
                </Text>
              </View>
              <View style={styles.contentsContainer}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: BRAND_COLORS.textSecondary,
                    fontWeight: 'bold',
                  }}
                >
                  구분 · 타입
                </Text>
                <Text
                  variant="titleSmall"
                  style={{ color: 'black', fontWeight: 'bold' }}
                >
                  {result?.main_typename} · {result?.sub_type}
                </Text>
              </View>
              <View style={styles.contentsContainer}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: BRAND_COLORS.textSecondary,
                    fontWeight: 'bold',
                  }}
                >
                  T/B 대상여부
                </Text>
                <Text
                  variant="titleSmall"
                  style={{ color: 'black', fontWeight: 'bold' }}
                >
                  {result?.is_required_testbed ? '대상' : '비대상'}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: verticalScale(8) }}>
              <View style={styles.contentsContainer}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: BRAND_COLORS.textSecondary,
                    fontWeight: 'bold',
                  }}
                >
                  SKT 바코드
                </Text>
                <Text
                  variant="titleSmall"
                  style={{ color: 'black', fontWeight: 'bold' }}
                >
                  {result?.skt_barcode}
                </Text>
              </View>
              <View style={styles.contentsContainer}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: BRAND_COLORS.textSecondary,
                    fontWeight: 'bold',
                  }}
                >
                  제조사 S/N
                </Text>
                <Text
                  variant="titleSmall"
                  style={{ color: 'black', fontWeight: 'bold' }}
                >
                  {result?.unit_serial}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={{ marginTop: verticalScale(16) }}>
          <View style={{ paddingHorizontal: scale(12) }}>
            {/*  */}
            {result?.last_manage_history?.location === '국소' && (
              <View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    통합시설코드
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{ color: 'black', fontWeight: 'bold' }}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.zp_code
                    }
                  </Text>
                </View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    현재 위치
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{
                      color: 'black',
                      fontWeight: 'bold',
                      maxWidth: scale(280),
                    }}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.zp_name
                    }
                  </Text>
                </View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    관리 부서
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{ color: 'black', fontWeight: 'bold' }}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.zp_manage_team
                    }
                  </Text>
                </View>
              </View>
            )}

            {result?.last_manage_history?.location === '전진배치(집/중/통)' && (
              <View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    통합시설코드
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{ color: 'black', fontWeight: 'bold' }}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.zp_code
                    }
                  </Text>
                </View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    현재 위치
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{
                      color: 'black',
                      fontWeight: 'bold',
                      maxWidth: scale(280),
                    }}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.zp_name
                    }
                  </Text>
                </View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    관리 부서
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{ color: 'black', fontWeight: 'bold' }}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.zp_manage_team
                    }
                  </Text>
                </View>
              </View>
            )}

            {result?.last_manage_history?.location === '창고' && (
              <View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    통합시설코드
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{ color: 'black', fontWeight: 'bold' }}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.zp_code
                    }
                  </Text>
                </View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    현재 위치
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{
                      color: 'black',
                      fontWeight: 'bold',
                      maxWidth: scale(280),
                    }}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.warehouse_name
                    }
                  </Text>
                </View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    관리 부서
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{ color: 'black', fontWeight: 'bold' }}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.warehouse_manage_team
                    }
                  </Text>
                </View>
              </View>
            )}

            {result?.last_manage_history?.location === '차량보관' && (
              <View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    현재 위치
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{
                      color: 'black',
                      fontWeight: 'bold',
                      maxWidth: scale(280),
                    }}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.vehicle_number
                    }
                  </Text>
                </View>
                <View style={styles.contentsContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: BRAND_COLORS.textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    관리 부서
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={{ color: 'black', fontWeight: 'bold' }}
                  >
                    {
                      result?.last_manage_history?.location_context_instance
                        ?.vehicle_manage_team
                    }
                  </Text>
                </View>
              </View>
            )}

            {/*  */}
            <View style={{ marginTop: verticalScale(16) }}>
              <View style={styles.contentsContainer}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: BRAND_COLORS.textSecondary,
                    fontWeight: 'bold',
                  }}
                >
                  이동유형(상태)
                </Text>
                <Text
                  variant="titleSmall"
                  style={{ color: 'black', fontWeight: 'bold' }}
                >
                  {result?.last_manage_history?.unit_movement} (
                  {result?.last_manage_history?.unit_state})
                </Text>
              </View>

              <View style={styles.contentsContainer}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: BRAND_COLORS.textSecondary,
                    fontWeight: 'bold',
                  }}
                >
                  이동 사유
                </Text>
              </View>
              <View>
                {(result?.last_manage_history?.unit_movement_desc !== '' ||
                  result?.last_manage_history?.state_desc !== '') && (
                  <View
                    style={{
                      backgroundColor: '#F0F0F0',
                      paddingHorizontal: scale(4),
                      paddingVertical: verticalScale(8),
                      marginVertical: verticalScale(4),
                      borderRadius: 10,
                    }}
                  >
                    {result?.last_manage_history?.state_desc !== '' && (
                      <Text
                        variant="bodyMedium"
                        style={{ color: 'black', fontWeight: 'bold' }}
                      >
                        {result?.last_manage_history?.state_desc}
                      </Text>
                    )}
                    {result?.last_manage_history?.movement_desc !== '' && (
                      <Text
                        variant="bodyMedium"
                        style={{ color: 'black', fontWeight: 'bold' }}
                      >
                        {result?.last_manage_history?.movement_desc}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
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
  contentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: verticalScale(4),
  },
});
