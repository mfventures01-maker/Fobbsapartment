import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function RestaurantPublic() {
    const { branchId } = useParams<{ branchId: string }>();
    const [menu, setMenu] = useState<any[]>([]);
    const [fingerprint, setFingerprint] = useState<string>("");

    useEffect(() => {
        if (!branchId) return;

        let isMounted = true;
        let interval: NodeJS.Timeout;

        const loadMenu = async () => {
            try {
                // Public RPC - NO AUTH REQUIRED
                const { data, error } = await supabase.rpc("get_qr_menu", {
                    p_branch_id: branchId,
                });

                if (error) throw error;

                if (!isMounted) return;

                // Fingerprint comparison to prevent unnecessary rerenders
                const newFingerprint = JSON.stringify(data?.menu || []);

                if (newFingerprint !== fingerprint) {
                    setMenu(data?.menu || []);
                    setFingerprint(newFingerprint);
                    console.log("[QR] Menu updated");
                }
            } catch (err) {
                // Silent fail - keep showing last known menu
                console.debug("[QR] Poll failed, preserving state");
            }
        };

        // Immediate load
        loadMenu();

        // 5-second passive mirror
        interval = setInterval(loadMenu, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [branchId, fingerprint]);

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
