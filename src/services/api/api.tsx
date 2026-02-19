import axios from 'axios';
import { BASE_URL } from '@env';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGlobalLogout } from '../../store/AuthContext';

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(
  async config => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const response = await axios.post(
          `${BASE_URL}/accounts/api/v1/accounts/refresh/`,
          {
            refresh: refreshToken,
          },
        );

        const { access } = response.data;
        await AsyncStorage.setItem('accessToken', access);

        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        originalRequest.headers['Authorization'] = `Bearer ${access}`;

        console.log('Access token refreshed successfully');

        return api(originalRequest);
      } catch (refreshError) {
        console.log('Refresh token expired or invalid:', refreshError.message);

        // 리프레시 토큰도 만료된 경우 로그아웃 처리
        const logout = getGlobalLogout();
        if (logout) {
          logout();
          console.log('User logged out due to expired refresh token');
        } else {
          console.warn('Global logout function not available');
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

//관리코드
export async function getUnitSubTypeList() {
  return await api
    .get('/apps/unit_subtype_list/')
    .then(response => response.data);
}

export async function getUnitDetailTypeList() {
  return await api
    .get('/apps/unit_detail_type_list/')
    .then(response => response.data);
}

export async function getWarehouseList() {
  return await api
    .get('/apps/unit_warehouse_list/')
    .then(response => response.data);
}

export async function getTeamList() {
  return await api.get('/accounts/team_list/').then(response => response.data);
}

export async function getRegionList() {
  return await api
    .get('/accounts/region_list/')
    .then(response => response.data);
}

export async function getLocationList() {
  return await api
    .get('/apps/location_type_list/')
    .then(response => response.data);
}

export async function getUnitStateList() {
  return await api
    .get('/apps/unit_state_list/')
    .then(response => response.data);
}

export async function getUnitLocationHistory(
  location: number,
  location_id: number,
  pageUrl?: string,
) {
  if (pageUrl) {
    return await api.get(pageUrl).then(response => response.data);
  }
  const params = { location, location_content_instance_id: location_id };
  return await api
    .get('/apps/unit_object_info_by_location/', { params })
    .then(response => response.data);
}

export async function getUnitCount(
  location: number,
  object_id: string,
  region: string,
  unit_detail_type: number,
) {
  const params = {
    location,
    object_id,
    location_managing_region: region,
    managed_unit__unit_detail_type: unit_detail_type,
  };
  return await api
    .get('/apps/unit_count_by_para2/', { params })
    .then(response => response.data);
}

export async function getUnitHistory(skt_barcode: string) {
  const params = { skt_barcode };
  return await api
    .get('/apps/unit_object_history_info/', { params })
    .then(response => response.data);
}

export async function changeWarehouse(warehouse: string) {
  const data = { my_warehouse: warehouse };
  return await api
    .put('/accounts/aboutme/update_my_warehouse/', data)
    .then(response => response.data);
}

// 대여 요청 API (페이지네이션 지원)
export async function getRentalRequests(
  params?: {
    role?: 'requester' | 'reviewer';
    status?: string;
  },
  pageUrl?: string,
) {
  if (pageUrl) {
    return await api.get(pageUrl).then(response => response.data);
  }
  return await api
    .get('/apps/rental-requests/', { params })
    .then(response => response.data);
}

// 대여 요청 목록 (전체 - 페이지네이션 없이, HomeScreen용)
export async function getRentalRequestsAll(params?: {
  role?: 'requester' | 'reviewer';
  status?: string;
}) {
  return await api
    .get('/apps/rental-requests/', { params })
    .then(response => {
      const data = response.data;
      return Array.isArray(data) ? data : data?.results || [];
    });
}

export async function getRentalRequestDetail(id: number) {
  return await api
    .get(`/apps/rental-requests/${id}/`)
    .then(response => response.data);
}

export async function createRentalRequest(data: {
  unit_id: number;
  requester_warehouse_id: number;
  request_memo?: string;
}) {
  return await api
    .post('/apps/rental-requests/', data)
    .then(response => response.data);
}

export async function approveRentalRequest(
  id: number,
  data: { shipping_method: string; approval_memo?: string },
) {
  return await api
    .patch(`/apps/rental-requests/${id}/approve/`, data)
    .then(response => response.data);
}

export async function rejectRentalRequest(
  id: number,
  data: { rejection_reason: string },
) {
  return await api
    .patch(`/apps/rental-requests/${id}/reject/`, data)
    .then(response => response.data);
}

export async function cancelRentalRequest(id: number) {
  return await api
    .patch(`/apps/rental-requests/${id}/cancel/`)
    .then(response => response.data);
}

export async function getRentalWarehouses() {
  return await api
    .get('/apps/rental-requests/warehouses/')
    .then(response => response.data);
}
