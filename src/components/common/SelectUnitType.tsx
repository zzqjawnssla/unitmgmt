import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Text } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSubTypes, useDetailTypes } from '../../hooks/useSelectList.ts';

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
  accordionId: string;
  expanded: string | null;
  options: Array<any>;
  onSelect: (item: any) => void;
  renderTitle?: (item: any) => string;
  onAccordionPress: (id: string) => void;
}

const SelectionItem: React.FC<SelectionItemProps> = ({
  value,
  accordionId,
  label,
  expanded,
  options,
  onSelect,
  onAccordionPress,
  renderTitle = (item: any) => item.label || item.typename || item.value,
}) => (
  <View style={styles.selectionSection}>
    <Text variant="labelMedium" style={styles.sectionLabel}>
      {label}
    </Text>
    <List.Accordion
      style={styles.accordionContent}
      title={value}
      titleStyle={styles.accordionTitle}
      expanded={expanded === accordionId}
      onPress={() => onAccordionPress(accordionId)}
    >
      {options && options.length > 0 ? (
        options.map((item: any, index: number) => (
          <List.Item
            key={`${accordionId}-${index}`}
            title={renderTitle(item)}
            onPress={() => onSelect(item)}
            style={styles.listItem}
            titleStyle={styles.listItemTitle}
          />
        ))
      ) : (
        <List.Item
          title="옵션이 없습니다"
          disabled
          style={styles.listItem}
          titleStyle={styles.listItemTitle}
        />
      )}
    </List.Accordion>
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
  const [unitExpanded, setUnitExpanded] = useState<string | null>(null);

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
    setSelectedMainType({ label: '선택', value: '' });
    setSelectedSubType({ id: '', typename: '선택' });
    setSelectedDetailType({ key: '', value: '선택' });
    setUnitExpanded(null);
  };

  const handleSelectMainType = (item: { label: string; value: string }) => {
    setSelectedMainType(item);
    setSelectedSubType({ id: '', typename: '선택' });
    setSelectedDetailType({ key: '', value: '선택' });
    setUnitExpanded(null);
  };

  const handleSelectSubType = (item: { id: string; typename: string }) => {
    setSelectedSubType(item);
    setSelectedDetailType({ key: '', value: '선택' });
    setUnitExpanded(null);
  };

  const handleSelectDetailType = (item: { key: string; value: string }) => {
    setSelectedDetailType(item);
    setUnitExpanded(null);
  };

  const handleAccordionPress = (id: string) => {
    setUnitExpanded(unitExpanded === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <List.Section style={styles.listSection}>
        <SelectionItem
          label="제조사"
          value={selectedManufacturer.value || '선택'}
          accordionId="1"
          expanded={unitExpanded}
          options={manufacturers}
          onSelect={handleSelectManufacturer}
          onAccordionPress={handleAccordionPress}
        />

        <SelectionItem
          label="장비 타입"
          value={selectedMainType.value || '선택'}
          accordionId="2"
          expanded={unitExpanded}
          options={filteredMainTypes}
          onSelect={handleSelectMainType}
          onAccordionPress={handleAccordionPress}
        />

        <SelectionItem
          label="장비 구분"
          value={selectedSubType.typename || '선택'}
          accordionId="3"
          expanded={unitExpanded}
          options={filteredTypeNames}
          onSelect={handleSelectSubType}
          onAccordionPress={handleAccordionPress}
          renderTitle={item => item.typename}
        />

        <SelectionItem
          label="유니트명"
          value={selectedDetailType.value || '선택'}
          accordionId="4"
          expanded={unitExpanded}
          options={uniqueDetailTypes}
          onSelect={handleSelectDetailType}
          onAccordionPress={handleAccordionPress}
          renderTitle={item => item.value}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: verticalScale(400),
  },
  listSection: {
    paddingHorizontal: scale(4),
  },
  selectionSection: {
    marginBottom: verticalScale(12),
  },
  sectionLabel: {
    color: '#666666',
    fontWeight: '600',
    marginBottom: verticalScale(8),
    marginTop: verticalScale(4),
    fontSize: scale(14),
  },
  accordionContent: {
    backgroundColor: '#F5F5F5',
    borderRadius: scale(8),
    marginVertical: verticalScale(1),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  accordionTitle: {
    color: '#333333',
    fontWeight: '600',
    fontSize: scale(16),
  },
  listItem: {
    paddingLeft: scale(16),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemTitle: {
    color: '#333333',
    fontSize: scale(14),
  },
});
