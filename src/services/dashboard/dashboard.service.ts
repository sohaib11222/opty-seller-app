import { request } from '../api/client';
import { storeService } from '../seller/store.service';
import type { DashboardSnapshot, RecentOrder, RevenuePoint } from '../../types/seller';
import { getActiveLanguage, translate } from '../../features/i18n/translate';
import { apiLabel } from '../../features/i18n/apiLabels';
import type { Language } from '../../features/i18n/dictionaries/core';

type DashboardResponse = {
  total_products: number;
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
  total_followers: number;
  total_revenue: number;
  today_revenue?: number;
  revenue_series?: RevenuePoint[];
  recent_orders: { id: number; order_no?: string | null; customer_name?: string | null; status: string; total: number; items_count: number; created_at?: string }[];
  statistics: {
    products: { current: number; last: number; change: number };
    orders: { current: number; last: number; change: number };
    followers: { current: number; last: number; change: number };
    revenue: { current: number; last: number; change: number };
  };
};

type LowStockResponse = { count: number };
type WalletResponse = { available_balance?: number | string };

const localeTag = (language: Language) => (language === 'it' ? 'it-IT' : 'en-IE');
const euro = (value: number | string | undefined, language: Language = getActiveLanguage()) => new Intl.NumberFormat(localeTag(language), { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value ?? 0));
const count = (value: number) => String(value).padStart(2, '0');

function orderDetail(order: DashboardResponse['recent_orders'][number]) {
  const label = apiLabel('orderStatus', order.status);
  const items = translate(order.items_count === 1 ? 'dashboard.itemCountOne' : 'dashboard.itemCountOther', { count: order.items_count });
  return `${label} · ${items}`;
}

function mapOrder(order: DashboardResponse['recent_orders'][number]): RecentOrder {
  return { id: order.id, orderNo: order.order_no ?? String(order.id), customer: order.customer_name ?? translate('dashboard.customerFallback'), detail: orderDetail(order), total: euro(order.total, getActiveLanguage()), status: order.status, createdAt: order.created_at };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [store, dashboard, lowStock, wallet] = await Promise.all([
    storeService.getStore(), request<DashboardResponse>('/seller/store/dashboard'), request<LowStockResponse>('/seller/inventory/low-stock'), request<WalletResponse>('/seller/wallet'),
  ]);

  return {
    store, storeName: store.name, city: store.meta?.profile?.city ?? 'Store details', rating: store.rating ? String(store.rating) : 'New', followers: `${store.followers_count ?? dashboard.total_followers} followers`,
    todaySales: euro(dashboard.today_revenue ?? dashboard.statistics.revenue.current), salesChange: Number(dashboard.statistics.revenue.change ?? 0), toFulfil: count(dashboard.pending_orders), availableEarnings: euro(wallet.available_balance), lowStock: count(lowStock.count), recentOrders: dashboard.recent_orders.map(mapOrder),
    totalProducts: dashboard.total_products, totalOrders: dashboard.total_orders, paidOrders: dashboard.paid_orders, monthlyRevenue: Number(dashboard.statistics.revenue.current ?? 0), monthlyRevenueChange: Number(dashboard.statistics.revenue.change ?? 0), monthlyOrders: Number(dashboard.statistics.orders.current ?? 0), monthlyFollowers: Number(dashboard.statistics.followers.current ?? 0), revenueSeries: dashboard.revenue_series ?? [],
  };
}

export { euro as formatEuro };
