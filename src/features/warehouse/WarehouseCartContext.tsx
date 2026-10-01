import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { sellerToolsService, type WarehouseCart } from '../../services/seller/tools.service';
import { useAuth } from '../auth/AuthContext';

type WarehouseCartState = { cart: WarehouseCart | null; count: number; loading: boolean; refreshCart: () => Promise<WarehouseCart | null>; setCart: (cart: WarehouseCart) => void };
const WarehouseCartContext = createContext<WarehouseCartState>({ cart: null, count: 0, loading: false, refreshCart: async () => null, setCart: () => undefined });

export function WarehouseCartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth(); const [cart, setCart] = useState<WarehouseCart | null>(null); const [loading, setLoading] = useState(false);
  const refreshCart = useCallback(async () => { if (!isAuthenticated) { setCart(null); return null; } try { setLoading(true); const next = await sellerToolsService.warehouseCart(); setCart(next); return next; } finally { setLoading(false); } }, [isAuthenticated]);
  useEffect(() => { if (!isAuthenticated) { const clear = setTimeout(() => setCart(null), 0); return () => clearTimeout(clear); } const initial = setTimeout(() => void refreshCart().catch(() => undefined), 0); const timer = setInterval(() => void refreshCart().catch(() => undefined), 10_000); return () => { clearTimeout(initial); clearInterval(timer); }; }, [isAuthenticated, refreshCart]);
  const count = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const value = useMemo(() => ({ cart, count, loading, refreshCart, setCart }), [cart, count, loading, refreshCart]);
  return <WarehouseCartContext.Provider value={value}>{children}</WarehouseCartContext.Provider>;
}

export const useWarehouseCart = () => useContext(WarehouseCartContext);
