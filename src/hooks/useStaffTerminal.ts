import { useState, useCallback } from 'react';
import { rpcClient } from '@/lib/rpcClient';
import { useAuth } from '@/contexts/AuthContext';

interface Order {
    id: string;
    status: string;
    total: number;
    discount: number;
    created_at: string;
}

interface OrderItem {
    id: string;
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
}

export function useStaffTerminal() {
    const { authority, shiftId } = useAuth();
    const branchId = authority.branchId;
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const logRPC = useCallback((name: string, payload: any, result: any, start: number) => {
        const duration = Date.now() - start;
        console.log(`[STAFF] ${name} → SUCCESS (${duration}ms)`, { payload, result });
    }, []);

    const logError = useCallback((name: string, payload: any, error: any) => {
        console.error(`[STAFF] ${name} → ERROR`, { payload, error: error.message });
    }, []);

    // 1. Refresh Order Details (Derives everything from backend truth)
    const refreshOrderDetails = useCallback(async (orderId: string) => {
        const start = Date.now();
        try {
            const result = await rpcClient.call('get_order_details', { p_order_id: orderId });
            logRPC('get_order_details', { orderId }, result, start);

            setCurrentOrder(result.order);
            setItems(result.items || []);

            return result;
        } catch (err: any) {
            logError('get_order_details', { orderId }, err);
            throw err;
        }
    }, [logRPC, logError]);

    // 2. Create New Order
    const createOrder = useCallback(async (customerName?: string) => {
        setIsLoading(true);
        setError(null);
        const start = Date.now();

        try {
            // Identity injection and shift gate are handled by callRPCWithContext 
            // but we use rpcClient.call directly here since we handle injection manually if needed
            // Actually our refactored rpcClient.call does identity injection automatically.

            const payload = {
                p_branch_id: branchId,
                p_customer_name: customerName || null,
                p_shift_id: shiftId || null
            };

            console.log('[STAFF] Creating order...', payload);
            const result = await rpcClient.call('create_order_gateway', payload);
            logRPC('create_order_gateway', payload, result, start);

            // Zero-Assumption: Fetch full state from backend after creation
            await refreshOrderDetails(result.order_id);

            return result;
        } catch (err: any) {
            logError('create_order_gateway', { branchId }, err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [branchId, shiftId, logRPC, logError, refreshOrderDetails]);

    // 3. Add Item to Order
    const addItem = useCallback(async (name: string, price: number, quantity: number) => {
        if (!currentOrder) throw new Error('No active order.');

        setIsLoading(true);
        setError(null);
        const start = Date.now();

        try {
            const payload = {
                p_order_id: currentOrder.id,
                p_name: name,
                p_price: price,
                p_quantity: quantity
            };

            const result = await rpcClient.call('add_order_item', payload);
            logRPC('add_order_item', payload, result, start);

            // Refresh to mirror backend recalculation
            await refreshOrderDetails(currentOrder.id);

            return result;
        } catch (err: any) {
            logError('add_order_item', { orderId: currentOrder?.id, name }, err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentOrder, logRPC, logError, refreshOrderDetails]);

    // 4. Apply Discount
    const applyDiscount = useCallback(async (amount: number) => {
        if (!currentOrder) throw new Error('No active order.');

        setIsLoading(true);
        setError(null);
        const start = Date.now();

        try {
            const payload = {
                p_order_id: currentOrder.id,
                p_amount: amount
            };

            const result = await rpcClient.call('apply_discount', payload);
            logRPC('apply_discount', payload, result, start);
            await refreshOrderDetails(currentOrder.id);

            return result;
        } catch (err: any) {
            logError('apply_discount', { orderId: currentOrder?.id, amount }, err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentOrder, logRPC, logError, refreshOrderDetails]);

    // 5. Process Payment
    const processPayment = useCallback(async (paymentMethod: 'cash' | 'card' | 'transfer' = 'cash') => {
        if (!currentOrder) throw new Error('No active order.');

        setIsLoading(true);
        setError(null);
        const start = Date.now();

        try {
            // Transition to payment phase
            await rpcClient.call('update_order_status', {
                p_order_id: currentOrder.id,
                p_status: 'pending_payment'
            });

            const payload = {
                p_order_id: currentOrder.id,
                p_amount: currentOrder.total,
                p_payment_method: paymentMethod
            };

            const result = await rpcClient.call('create_payment_intent', payload);
            logRPC('create_payment_intent', payload, result, start);

            // Update local mirror status
            setCurrentOrder(prev => prev ? { ...prev, status: 'paid' } : null);

            return result;
        } catch (err: any) {
            logError('process_payment', { orderId: currentOrder?.id, paymentMethod }, err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentOrder, logRPC, logError]);

    // 6. Void Order
    const voidOrder = useCallback(async (reason: string) => {
        if (!currentOrder) throw new Error('No active order.');

        setIsLoading(true);
        setError(null);
        const start = Date.now();

        try {
            const payload = {
                p_order_id: currentOrder.id,
                p_reason: reason
            };

            const result = await rpcClient.call('void_order', payload);
            logRPC('void_order', payload, result, start);

            setCurrentOrder(null);
            setItems([]);

            return result;
        } catch (err: any) {
            logError('void_order', { orderId: currentOrder.id, reason }, err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentOrder, logRPC, logError]);

    // 7. Get Order History
    const getOrderHistory = useCallback(async (limit: number = 20, offset: number = 0) => {
        setIsLoading(true);
        const start = Date.now();
        try {
            const payload = {
                p_branch_id: branchId,
                p_limit: limit,
                p_offset: offset
            };
            const result = await rpcClient.call('get_order_history', payload);
            logRPC('get_order_history', payload, result, start);
            return result.orders || [];
        } catch (err: any) {
            logError('get_order_history', { branchId }, err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [branchId, logRPC, logError]);

    return {
        currentOrder,
        items,
        isLoading,
        error,
        createOrder,
        addItem,
        applyDiscount,
        processPayment,
        voidOrder,
        refreshOrderDetails,
        getOrderHistory,
        subtotal: currentOrder?.total ?? 0,
        discount: currentOrder?.discount ?? 0,
        total: currentOrder?.total ?? 0
    };
}
