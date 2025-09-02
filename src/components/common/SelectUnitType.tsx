import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSubTypes, useDetailTypes } from '../../hooks/useSelectList.ts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F9F9F9',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#AAAAAA',
  border: '#E0E0E0',
  disabledBackground: '#F5F5F5',
  disabledBorder: '#EEEEEE',
};

interface SelectUnitTypeProps {
  selectedDetailType: { key: string; value: string };
  setSelectedDetailType: React.Dispatch<
    React.SetStateAction<{ key: string; value: string }>
  >;
  selectedManufacturer: { label: string; value: string };
  setSelectedManufacturer: React.Dispatch<
    React.SetStateAction<{ label: string; value: string }>
  >;
  selectedMainType: { label: string; value: string };
  setSelectedMainType: React.Dispatch<
    React.SetStateAction<{ label: string; value: string }>
  >;
  selectedSubType: { id: string; typename: string };
  setSelectedSubType: React.Dispatch<
    React.SetStateAction<{ id: string; typename: string }>
  >;
}

interface SubTypeResult {
  id: number;
  manufacturer: string;
  main_type: string;
  typename: string;
}

interface DetailTypeResult {
  id: number;
  sub_type_id: number;
  typename: string;
}

// 유틸리티 함수 - 고유 값 추출
const getUniqueValues = (
  list: SubTypeResult[] | undefined,
  key: keyof SubTypeResult,
) => {
  if (!list) return [];

  return [...new Set(list.map(item => item[key]))].map(value => ({
    label: value as string,
    value: value as string,
  }));
};

// 선택 항목 컴포넌트
interface SelectionItemProps {
  label: string;
  value: string;
  expanded: boolean;
  options: Array<any>;
  onSelect: (item: any) => void;
  renderTitle?: (item: any) => string;
  onToggle: () => void;
  disabled?: boolean;
}

const SelectionItem: React.FC<SelectionItemProps> = ({
  value,
  label,
  expanded,
  options,
  onSelect,
  onToggle,
  disabled = false,
  renderTitle = (item: any) => item.label || item.typename || item.value,
}) => (
  <View style={styles.selectionSection}>
    <Text style={styles.sectionLabel}>{label}</Text>

    <TouchableOpacity
      style={[
        styles.selectionHeader,
        disabled && styles.selectionHeaderDisabled,
        expanded && styles.selectionHeaderExpanded,
      ]}
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
    >
      <Text
        style={[
          styles.selectionValue,
          disabled && styles.selectionValueDisabled,
          !value && styles.selectionPlaceholder,
        ]}
        numberOfLines={1}
      >
        {value || '선택해주세요'}
      </Text>
      <MaterialIcons
        name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
        size={scale(18)}
        color={
          disabled
            ? COLORS.textTertiary
            : expanded
            ? COLORS.primary
            : COLORS.textSecondary
        }
      />
    </TouchableOpacity>

    {expanded && (
      <View style={styles.optionsList}>
        {options && options.length > 0 ? (
          options.map((item: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionItem,
                index === options.length - 1 && styles.optionItemLast,
              ]}
              onPress={() => onSelect(item)}
            >
              <Text style={styles.optionText}>{renderTitle(item)}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.optionItem}>
            <Text style={styles.optionTextDisabled}>
              선택할 수 있는 옵션이 없습니다
            </Text>
          </View>
        )}
      </View>
    )}
  </View>
);

export const SelectUnitType: React.FC<SelectUnitTypeProps> = ({
  selectedManufacturer,
  setSelectedMainType,
  selectedSubType,
  setSelectedSubType,
  selectedDetailType,
  setSelectedDetailType,
  setSelectedManufacturer,
  selectedMainType,
}) => {
  const { data: subTypeList } = useSubTypes();
  const { data: detailTypeList } = useDetailTypes();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // 필터링된 옵션 상태
  const [filteredMainTypes, setFilteredMainTypes] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [filteredTypeNames, setFilteredTypeNames] = useState<
    Array<{ id: string; typename: string }>
  >([]);

  // 제조사 목록
  const manufacturers = getUniqueValues(subTypeList?.results, 'manufacturer');

  // 메인 타입 필터링
  useEffect(() => {
    if (
      selectedManufacturer.value !== '' &&
      selectedManufacturer.value !== '선택'
    ) {
      const filtered = subTypeList?.results?.filter(
        (subtype: SubTypeResult) =>
          subtype.manufacturer === selectedManufacturer.value,
      );
      setFilteredMainTypes(getUniqueValues(filtered, 'main_type'));
    } else {
      setFilteredMainTypes([]);
    }
  }, [selectedManufacturer, subTypeList]);

  // 서브 타입 필터링
  useEffect(() => {
    if (
      selectedManufacturer.value !== '' &&
      selectedManufacturer.value !== '선택' &&
      selectedMainType.value !== '' &&
      selectedMainType.value !== '선택'
    ) {
      const filtered = subTypeList?.results?.filter(
        (subtype: SubTypeResult) =>
          subtype.manufacturer === selectedManufacturer.value &&
          subtype.main_type === selectedMainType.value,
      );
      setFilteredTypeNames(
        filtered?.map((item: SubTypeResult) => ({
          id: item.id.toString(),
          typename: item.typename,
        })) || [],
      );
    } else {
      setFilteredTypeNames([]);
    }
  }, [selectedManufacturer, selectedMainType, subTypeList]);

  // 상세 타입 필터링
  const uniqueDetailTypes = React.useMemo(() => {
    if (!detailTypeList?.results || !selectedSubType?.id) return [];

    const filtered = detailTypeList.results.filter(
      (item: DetailTypeResult) =>
        item.sub_type_id.toString() === selectedSubType.id,
    );

    return Array.from(
      new Map(
        filtered.map((item: DetailTypeResult) => [item.id, item]),
      ).values(),
    ).map((item: unknown) => {
      const detailItem = item as DetailTypeResult;
      return {
        key: detailItem.id.toString(),
        value: detailItem.typename,
      };
    });
  }, [detailTypeList, selectedSubType?.id]);

  // 선택 핸들러
  const handleSelectManufacturer = (item: { label: string; value: string }) => {
    setSelectedManufacturer(item);
    setSelectedMainType({ label: '', value: '' });
    setSelectedSubType({ id: '', typename: '' });
    setSelectedDetailType({ key: '', value: '' });
    setExpandedSection(null);
  };

  const handleSelectMainType = (item: { label: string; value: string }) => {
    setSelectedMainType(item);
    setSelectedSubType({ id: '', typename: '' });
    setSelectedDetailType({ key: '', value: '' });
    setExpandedSection(null);
  };

  const handleSelectSubType = (item: { id: string; typename: string }) => {
    setSelectedSubType(item);
    setSelectedDetailType({ key: '', value: '' });
    setExpandedSection(null);
  };

  const handleSelectDetailType = (item: { key: string; value: string }) => {
    setSelectedDetailType(item);
    setExpandedSection(null);
  };

  const handleToggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <View style={styles.container}>
      <SelectionItem
        label="제조사"
        value={selectedManufacturer.label}
        expanded={expandedSection === 'manufacturer'}
        options={manufacturers}
        onSelect={handleSelectManufacturer}
        onToggle={() => handleToggleSection('manufacturer')}
      />

      <SelectionItem
        label="장비 타입"
        value={selectedMainType.label}
        expanded={expandedSection === 'mainType'}
        options={filteredMainTypes}
        onSelect={handleSelectMainType}
        onToggle={() => handleToggleSection('mainType')}
        disabled={!selectedManufacturer.value}
      />

      <SelectionItem
        label="장비 구분"
        value={selectedSubType.typename}
        expanded={expandedSection === 'subType'}
        options={filteredTypeNames}
        onSelect={handleSelectSubType}
        onToggle={() => handleToggleSection('subType')}
        renderTitle={item => item.typename}
        disabled={!selectedMainType.value}
      />

      <SelectionItem
        label="유니트명"
        value={selectedDetailType.value}
        expanded={expandedSection === 'detailType'}
        options={uniqueDetailTypes}
        onSelect={handleSelectDetailType}
        onToggle={() => handleToggleSection('detailType')}
        renderTitle={item => item.value}
        disabled={!selectedSubType.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectionSection: {
    marginBottom: verticalScale(12),
  },
  sectionLabel: {
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: verticalScale(8),
    fontSize: scale(14),
    paddingLeft: scale(2),
  },
  selectionHeader: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: verticalScale(44),
  },
  selectionHeaderDisabled: {
    backgroundColor: COLORS.disabledBackground,
    borderColor: COLORS.disabledBorder,
  },
  selectionHeaderExpanded: {
    borderColor: COLORS.primary,
  },
  selectionValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: scale(14),
    fontWeight: '400',
  },
  selectionValueDisabled: {
    color: COLORS.textTertiary,
  },
  selectionPlaceholder: {
    color: COLORS.textSecondary,
  },
  optionsList: {
    marginTop: verticalScale(2),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    overflow: 'hidden',
    maxHeight: verticalScale(200),
  },
  optionItem: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    color: COLORS.text,
    fontSize: scale(13),
    fontWeight: '400',
  },
  optionTextDisabled: {
    color: COLORS.textSecondary,
    fontSize: scale(14),
    textAlign: 'center',
    fontStyle: 'normal',
  },
});
