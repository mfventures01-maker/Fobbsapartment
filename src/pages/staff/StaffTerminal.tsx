import React, { useState } from 'react';
import { useStaffTerminal } from '@/hooks/useStaffTerminal';

export const StaffTerminal: React.FC = () => {
    const {
        currentOrder,
        items,
        isLoading,
        error,
        createOrder,
        addItem,
        applyDiscount,
        processPayment,
        voidOrder,
        getOrderHistory
    } = useStaffTerminal();

    const [customerName, setCustomerName] = useState('');
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemQty, setItemQty] = useState('1');
    const [discountAmount, setDiscountAmount] = useState('');
    const [history, setHistory] = useState<any[]>([]);

    const handleCreateOrder = async () => {
        await createOrder(customerName);
        setCustomerName('');
    };

    const handleAddItem = async () => {
        await addItem(itemName, parseFloat(itemPrice), parseInt(itemQty));
        setItemName('');
        setItemPrice('');
        setItemQty('1');
    };

    const handleApplyDiscount = async () => {
        await applyDiscount(parseFloat(discountAmount));
        setDiscountAmount('');
    };

    const handleProcessPayment = async () => {
        await processPayment('cash');
    };

    const handleVoidOrder = async () => {
        const reason = prompt('Reason for voiding order:');
        if (reason) {
            await voidOrder(reason);
        }
    };

    const handleLoadHistory = async () => {
        const orders = await getOrderHistory(20, 0);
        setHistory(orders);
    };

    return (
        <div className="staff-terminal p-8 bg-zinc-50 min-h-screen font-mono text-zinc-900">
            <div className="terminal-header flex justify-between items-center mb-12 border-b-2 border-zinc-900 pb-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter">Staff Terminal</h1>
                <button
                    onClick={handleLoadHistory}
                    className="px-6 py-2 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors uppercase font-bold text-xs"
                >
                    Load History
                </button>
            </div>

            {error && (
                <div className="error-banner mb-6 p-4 bg-red-100 border-2 border-red-900 text-red-900 font-bold">
                    💥 {error}
                </div>
            )}

            <div className="terminal-layout grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Order Creation */}
                <div className="order-creation section-container p-6 border-2 border-zinc-900 bg-white">
                    <h2 className="text-xl font-black uppercase mb-6 tracking-wide underline underline-offset-4">New Order</h2>
                    <div className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Customer Name (optional)"
                            className="w-full px-4 py-3 border-2 border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-400 font-bold"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                        <button
                            onClick={handleCreateOrder}
                            disabled={isLoading}
                            className="w-full py-4 bg-zinc-900 text-white font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                        >
                            Create Order
                        </button>
                    </div>
                </div>

                {/* Active Order */}
                {currentOrder && (
                    <div className="active-order section-container p-6 border-2 border-emerald-900 bg-white shadow-[8px_8px_0px_0px_rgba(6,78,59,1)]">
                        <h2 className="text-xl font-black uppercase mb-2 text-emerald-900">Active Order #{currentOrder.id.slice(0, 8)}</h2>
                        <div className="flex justify-between items-center border-b-2 border-zinc-100 pb-4 mb-4">
                            <span className="font-bold uppercase text-xs px-2 py-1 bg-zinc-100">{currentOrder.status}</span>
                            <span className="text-2xl font-black">₦{currentOrder.total.toLocaleString()}</span>
                        </div>

                        {/* Items */}
                        <div className="items-list mb-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Current Line Items</h3>
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                                {items.map((item) => (
                                    <div key={item.id} className="item-row flex justify-between font-bold border-b border-zinc-50 pb-2">
                                        <span>{item.qty}x {item.name}</span>
                                        <span>₦{item.line_total.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Item form */}
                        <div className="add-item grid grid-cols-2 gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Item name"
                                className="col-span-2 px-4 py-2 border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Price"
                                className="px-4 py-2 border-2 border-zinc-200 font-bold"
                                value={itemPrice}
                                onChange={(e) => setItemPrice(e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Qty"
                                className="px-4 py-2 border-2 border-zinc-200 font-bold"
                                value={itemQty}
                                onChange={(e) => setItemQty(e.target.value)}
                            />
                            <button
                                onClick={handleAddItem}
                                disabled={isLoading}
                                className="col-span-2 py-3 bg-zinc-100 font-black uppercase border-2 border-zinc-900 hover:bg-zinc-200"
                            >
                                Confirm Add item
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="order-actions grid grid-cols-2 gap-4">
                            <button
                                onClick={handleProcessPayment}
                                disabled={isLoading || currentOrder.total === 0}
                                className="py-4 bg-emerald-700 text-white font-black uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-[4px_4px_0_0_rgb(6,78,59)]"
                            >
                                Process Pay
                            </button>
                            <button
                                onClick={handleVoidOrder}
                                disabled={isLoading}
                                className="py-4 bg-red-100 text-red-900 font-black uppercase text-xs border-2 border-red-900"
                            >
                                Void Order
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Order History */}
            {history.length > 0 && (
                <div className="order-history mt-16 p-6 border-2 border-zinc-900 bg-white">
                    <h2 className="text-2xl font-black uppercase mb-8 underline underline-offset-8">Recent Activity Log (Backend Reality)</h2>
                    <div className="grid grid-cols-1 gap-2">
                        {history.map((order) => (
                            <div key={order.id} className="history-item flex justify-between p-4 border border-zinc-100 hover:bg-zinc-50 font-bold">
                                <span>#{order.id.slice(0, 8)}</span>
                                <span className="uppercase text-xs px-2 py-1 bg-zinc-100 self-center">{order.status}</span>
                                <span className="text-zinc-600">₦{order.total.toLocaleString()}</span>
                                <span className="text-xs text-zinc-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="font-black text-4xl animate-pulse tracking-tighter uppercase">Applying deterministic state...</div>
                </div>
            )}
        </div>
    );
}

export default StaffTerminal;
