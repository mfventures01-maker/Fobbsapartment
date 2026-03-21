import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callRPC } from "@/lib/rpcClient";
import { useDeterministicPolling } from "@/hooks/useDeterministicPolling";

export default function RestaurantPublic() {
    const { branchId } = useParams<{ branchId: string }>();
    const [menu, setMenu] = useState<any[]>([]);
    const [fingerprint, setFingerprint] = useState<string>("");

    const loadMenu = async () => {
        try {
            // Public RPC - STRICT ENFORCEMENT
            const payload = { p_branch_id: branchId };
            const data = await callRPC<any>('public', 'get_qr_menu', payload);

            // Assuming data returns an object like { menu: [] }
            // We use data directly to mimic the backend response
            const returnedMenu = data?.menu || [];
            const newFingerprint = JSON.stringify(returnedMenu);

            if (newFingerprint !== fingerprint) {
                setMenu(returnedMenu);
                setFingerprint(newFingerprint);
                console.log("[QR] Menu updated");
            }
        } catch (err: any) {
            // RULE 7: ERROR VISIBILITY PROTOCOL
            console.error("💥 SYSTEM ERROR:", {
                rpc: 'get_qr_menu',
                payload: { p_branch_id: branchId },
                error: err
            });
            alert(err.message);
        }
    };

    useDeterministicPolling(async () => {
        if (!branchId) return;
        await loadMenu();
    }, 5000);

    // Initial load
    useEffect(() => {
        if (branchId) loadMenu();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId]);

    return (
        <div className="qr-menu-container">
            {menu.map((item) => (
                <div key={item.id} className="menu-item bg-white p-4 shadow mb-4 rounded">
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-gray-600">{item.description}</p>
                    <span className="text-emerald-600">${item.price}</span>
                </div>
            ))}
        </div>
    );
}
