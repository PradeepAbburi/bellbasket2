import {
    ShoppingBasket, UtensilsCrossed,
    Shirt, Sparkles,
    Settings as Tool, Car, Home, HeartPulse, Briefcase, Truck,
    MoreHorizontal as OtherIcon
} from 'lucide-react';

export const CATEGORY_METADATA: Record<string, { icon: any, color: string, gradient: string, type: 'product' | 'service' }> = {
    "Grocery": {
        icon: ShoppingBasket,
        color: "#22c55e",
        gradient: "from-green-400 to-green-600",
        type: 'product'
    },
    "Food": {
        icon: UtensilsCrossed,
        color: "#e11d48",
        gradient: "from-pink-500 to-rose-600",
        type: 'product'
    },
    "Fashion": {
        icon: Shirt,
        color: "#8b5cf6",
        gradient: "from-violet-400 to-violet-600",
        type: 'product'
    },
    "Beauty": {
        icon: Sparkles,
        color: "#f472b6",
        gradient: "from-pink-300 to-rose-500",
        type: 'product'
    },
    "Others": {
        icon: OtherIcon,
        color: "#f43f5e",
        gradient: "from-rose-400 to-rose-600",
        type: 'product'
    },
    "Repairs": {
        icon: Tool,
        color: "#64748b",
        gradient: "from-slate-500 to-slate-700",
        type: 'service'
    },
    "Home Services": {
        icon: Home,
        color: "#eab308",
        gradient: "from-yellow-400 to-amber-600",
        type: 'service'
    },
    "Vehicle Services": {
        icon: Car,
        color: "#1d4ed8",
        gradient: "from-blue-600 to-indigo-800",
        type: 'service'
    },
    "Health & Wellness": {
        icon: HeartPulse,
        color: "#10b981",
        gradient: "from-green-400 to-teal-600",
        type: 'service'
    },
    "Professional Services": {
        icon: Briefcase,
        color: "#6d28d9",
        gradient: "from-violet-600 to-indigo-900",
        type: 'service'
    },
    "Delivery & Logistics": {
        icon: Truck,
        color: "#ca8a04",
        gradient: "from-yellow-600 to-amber-800",
        type: 'service'
    },
    "Other Services": {
        icon: OtherIcon,
        color: "#64748b",
        gradient: "from-slate-400 to-slate-600",
        type: 'service'
    }
};
