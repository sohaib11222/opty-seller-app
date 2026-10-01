import type { SellerStore } from '../services/seller/store.service';

export type RecentOrder = { id: number; orderNo: string; customer: string; detail: string; total: string; status: string; createdAt?: string };
export type RevenuePoint = { label: string; value: number };

export type DashboardSnapshot = {
  store: SellerStore;
  storeName: string;
  city: string;
  rating: string;
  followers: string;
  todaySales: string;
  salesChange: number;
  toFulfil: string;
  availableEarnings: string;
  lowStock: string;
  recentOrders: RecentOrder[];
  totalProducts: number;
  totalOrders: number;
  paidOrders: number;
  monthlyRevenue: number;
  monthlyRevenueChange: number;
  monthlyOrders: number;
  monthlyFollowers: number;
  revenueSeries: RevenuePoint[];
};
