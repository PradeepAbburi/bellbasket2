import {
    ShoppingBasket, Milk, Apple, Beef, Pill, Coffee, Home, UtensilsCrossed,
    Zap, Laptop, Wrench, PencilLine, Gift, Shirt, Sparkles, FlameKindling,
    Leaf, Smartphone, Bike, Car, Wind, Tv, Droplets, Waves, Hammer,
    Paintbrush, Bug, Brush, Palette, Cpu, Wifi, Settings as Tool,
    Truck, PawPrint, Dumbbell, Book, Baby, Sprout, Flower2, Scissors,
    Building2, BookOpen, Layout, Calendar, Activity, Stethoscope,
    Briefcase, Scale, Music, Heart, Mic, Gamepad2, Camera as PhotographyIcon,
    HardHat, School, Home as InteriorIcon, Palette as DesignIcon, Code,
    Headphones, Shirt as LaundryIcon, Plane, Utensils, Lock,
    Scissors as TailorIcon, Smartphone as MobileIcon, Laptop as LaptopIcon,
    Tv as TvIcon, Fan, Droplets as WaterIcon, Thermometer, Microwave,
    Hammer as CarpenterIcon, Paintbrush as PainterIcon, Bug as PestIcon,
    Brush as CleaningIcon, Cpu as SoftwareIcon, Wifi as WifiIcon,
    Dumbbell as GymIcon, HeartPulse, GraduationCap, MapPin, Camera,
    Gavel, Sparkles as AstrologyIcon, UtensilsCrossed as CateringIcon,
    UserCog, ShieldCheck, Footprints, Sofa, Eye, CarFront, Truck as CourierIcon,
    Sun, Shield, Waves as WaterTankIcon, Cpu as HomeAutoIcon, Layout as GlassIcon,
    Utensils as TiffinIcon, HeartPulse as PhysioIcon, Flower2 as YogaIcon,
    Dog as PetGroomingIcon, Droplets as CarWashIcon, Shirt as DryCleaningIcon,
    MoreHorizontal as OtherIcon
} from 'lucide-react';

export const CATEGORY_METADATA: Record<string, { icon: any, color: string, gradient: string, type: 'product' | 'service' }> = {
    "Grocery": {
        icon: ShoppingBasket,
        color: "#22c55e",
        gradient: "from-green-400 to-green-600",
        type: 'product'
    },
    "Dairy & Eggs": {
        icon: Milk,
        color: "#3b82f6",
        gradient: "from-blue-400 to-blue-600",
        type: 'product'
    },
    "Fruits & Vegetables": {
        icon: Apple,
        color: "#f97316",
        gradient: "from-orange-400 to-orange-600",
        type: 'product'
    },
    "Food": {
        icon: UtensilsCrossed,
        color: "#e11d48",
        gradient: "from-pink-500 to-rose-600",
        type: 'product'
    },
    "Meat & Seafood": {
        icon: Beef,
        color: "#ef4444",
        gradient: "from-red-400 to-red-600",
        type: 'product'
    },
    "Beverages": {
        icon: Coffee,
        color: "#84cc16",
        gradient: "from-lime-400 to-lime-600",
        type: 'product'
    },
    "Pharmacy": {
        icon: Pill,
        color: "#06b6d4",
        gradient: "from-cyan-400 to-cyan-600",
        type: 'product'
    },
    "Household": {
        icon: Home,
        color: "#64748b",
        gradient: "from-slate-400 to-slate-600",
        type: 'product'
    },
    "Electrical": {
        icon: Zap,
        color: "#fbbf24",
        gradient: "from-amber-400 to-amber-600",
        type: 'product'
    },
    "Computers & Accessories": {
        icon: Laptop,
        color: "#6366f1",
        gradient: "from-indigo-400 to-indigo-600",
        type: 'product'
    },
    "Hardware": {
        icon: Wrench,
        color: "#94a3b8",
        gradient: "from-slate-400 to-slate-500",
        type: 'product'
    },
    "Clothes & Accessories": {
        icon: Shirt,
        color: "#8b5cf6",
        gradient: "from-violet-400 to-violet-600",
        type: 'product'
    },
    "Stationery": {
        icon: PencilLine,
        color: "#0ea5e9",
        gradient: "from-sky-400 to-sky-600",
        type: 'product'
    },
    "Gifts & Toys": {
        icon: Gift,
        color: "#ec4899",
        gradient: "from-pink-400 to-pink-600",
        type: 'product'
    },
    "Beauty & Personal Care": {
        icon: Sparkles,
        color: "#f472b6",
        gradient: "from-pink-300 to-rose-500",
        type: 'product'
    },
    "Puja & Religious": {
        icon: FlameKindling,
        color: "#ea580c",
        gradient: "from-orange-500 to-red-600",
        type: 'product'
    },
    "Ayurveda & Wellness": {
        icon: Leaf,
        color: "#16a34a",
        gradient: "from-green-500 to-emerald-700",
        type: 'product'
    },
    "Pet Care": {
        icon: PawPrint,
        color: "#d97706",
        gradient: "from-amber-600 to-orange-700",
        type: 'product'
    },
    "Sports & Fitness": {
        icon: GymIcon,
        color: "#ef4444",
        gradient: "from-red-500 to-orange-600",
        type: 'product'
    },
    "Books & Media": {
        icon: Book,
        color: "#4f46e5",
        gradient: "from-indigo-400 to-blue-600",
        type: 'product'
    },
    "Baby Care": {
        icon: Baby,
        color: "#ec4899",
        gradient: "from-pink-400 to-rose-600",
        type: 'product'
    },
    "Garden & Outdoor": {
        icon: Sprout,
        color: "#059669",
        gradient: "from-emerald-500 to-green-700",
        type: 'product'
    },
    "Music & Instruments": {
        icon: Music,
        color: "#7c3aed",
        gradient: "from-violet-500 to-purple-800",
        type: 'product'
    },
    "Gaming": {
        icon: Gamepad2,
        color: "#4338ca",
        gradient: "from-indigo-600 to-purple-900",
        type: 'product'
    },
    "Footwear": {
        icon: Footprints,
        color: "#92400e",
        gradient: "from-amber-700 to-orange-900",
        type: 'product'
    },
    "Home Decor": {
        icon: Sofa,
        color: "#0d9488",
        gradient: "from-teal-400 to-emerald-600",
        type: 'product'
    },
    "Eyewear": {
        icon: Eye,
        color: "#475569",
        gradient: "from-slate-500 to-slate-700",
        type: 'product'
    },
    "Automotive Accessories": {
        icon: CarFront,
        color: "#dc2626",
        gradient: "from-red-500 to-red-700",
        type: 'product'
    },
    "Mobile Repair": {
        icon: MobileIcon,
        color: "#3b82f6",
        gradient: "from-blue-400 to-blue-700",
        type: 'service'
    },
    "Laptop Repair": {
        icon: LaptopIcon,
        color: "#6366f1",
        gradient: "from-indigo-400 to-indigo-600",
        type: 'service'
    },
    "AC Repair": {
        icon: Fan,
        color: "#06b6d4",
        gradient: "from-cyan-400 to-cyan-600",
        type: 'service'
    },
    "All Repairs": {
        icon: Tool,
        color: "#64748b",
        gradient: "from-slate-500 to-slate-700",
        type: 'service'
    },
    "Bike Mechanic": {
        icon: Bike,
        color: "#b91c1c",
        gradient: "from-red-600 to-red-900",
        type: 'service'
    },
    "Car Mechanic": {
        icon: Car,
        color: "#1d4ed8",
        gradient: "from-blue-600 to-indigo-800",
        type: 'service'
    },
    "Electrician": {
        icon: Zap,
        color: "#eab308",
        gradient: "from-yellow-400 to-amber-600",
        type: 'service'
    },
    "Refrigerator Repair": {
        icon: Wind,
        color: "#60a5fa",
        gradient: "from-blue-300 to-blue-500",
        type: 'service'
    },
    "TV Repair": {
        icon: TvIcon,
        color: "#4f46e5",
        gradient: "from-indigo-500 to-blue-700",
        type: 'service'
    },
    "Water Purifier Repair": {
        icon: WaterIcon,
        color: "#2563eb",
        gradient: "from-blue-400 to-blue-600",
        type: 'service'
    },
    "Geyser Repair": {
        icon: Thermometer,
        color: "#f43f5e",
        gradient: "from-rose-500 to-red-700",
        type: 'service'
    },
    "Microwave Repair": {
        icon: Microwave,
        color: "#6d28d9",
        gradient: "from-violet-600 to-purple-900",
        type: 'service'
    },
    "Carpenter": {
        icon: CarpenterIcon,
        color: "#78350f",
        gradient: "from-amber-900 to-stone-900",
        type: 'service'
    },
    "Painter": {
        icon: PainterIcon,
        color: "#db2777",
        gradient: "from-pink-600 to-rose-800",
        type: 'service'
    },
    "Pest Control": {
        icon: PestIcon,
        color: "#16a34a",
        gradient: "from-green-500 to-emerald-800",
        type: 'service'
    },
    "Cleaning Services": {
        icon: CleaningIcon,
        color: "#22d3ee",
        gradient: "from-cyan-300 to-sky-500",
        type: 'service'
    },
    "Designer": {
        icon: DesignIcon,
        color: "#f43f5e",
        gradient: "from-rose-400 to-pink-600",
        type: 'service'
    },
    "Software Services": {
        icon: SoftwareIcon,
        color: "#6d28d9",
        gradient: "from-violet-600 to-indigo-900",
        type: 'service'
    },
    "Wifi Technician": {
        icon: WifiIcon,
        color: "#3b82f6",
        gradient: "from-blue-500 to-blue-700",
        type: 'service'
    },
    "Laundry Service": {
        icon: LaundryIcon,
        color: "#0ea5e9",
        gradient: "from-sky-400 to-blue-600",
        type: 'service'
    },
    "Packers & Movers": {
        icon: Truck,
        color: "#ca8a04",
        gradient: "from-yellow-600 to-amber-800",
        type: 'service'
    },
    "Saloon & Spa": {
        icon: Sparkles,
        color: "#f472b6",
        gradient: "from-pink-300 to-rose-500",
        type: 'service'
    },
    "Plumber": {
        icon: Droplets,
        color: "#3b82f6",
        gradient: "from-blue-400 to-cyan-600",
        type: 'service'
    },
    "Gardener": {
        icon: Flower2,
        color: "#10b981",
        gradient: "from-emerald-400 to-green-600",
        type: 'service'
    },
    "Tailor": {
        icon: TailorIcon,
        color: "#f43f5e",
        gradient: "from-rose-400 to-pink-600",
        type: 'service'
    },
    "Real Estate Services": {
        icon: Building2,
        color: "#4f46e5",
        gradient: "from-indigo-600 to-blue-900",
        type: 'service'
    },
    "Tutor & Education": {
        icon: GraduationCap,
        color: "#f59e0b",
        gradient: "from-amber-400 to-yellow-600",
        type: 'service'
    },
    "Interior Design": {
        icon: InteriorIcon,
        color: "#5b21b6",
        gradient: "from-purple-700 to-indigo-900",
        type: 'service'
    },
    "Event Management": {
        icon: Calendar,
        color: "#ef4444",
        gradient: "from-red-400 to-rose-600",
        type: 'service'
    },
    "Photography": {
        icon: PhotographyIcon,
        color: "#0e7490",
        gradient: "from-cyan-600 to-blue-800",
        type: 'service'
    },
    "Health & Wellness": {
        icon: HeartPulse,
        color: "#10b981",
        gradient: "from-green-400 to-teal-600",
        type: 'service'
    },
    "Legal Services": {
        icon: Gavel,
        color: "#475569",
        gradient: "from-slate-500 to-slate-800",
        type: 'service'
    },
    "Astrology": {
        icon: AstrologyIcon,
        color: "#7c3aed",
        gradient: "from-violet-500 to-indigo-800",
        type: 'service'
    },
    "Chef & Catering": {
        icon: CateringIcon,
        color: "#ea580c",
        gradient: "from-orange-500 to-red-700",
        type: 'service'
    },
    "Driver Services": {
        icon: UserCog,
        color: "#2563eb",
        gradient: "from-blue-500 to-blue-800",
        type: 'service'
    },
    "Security Services": {
        icon: ShieldCheck,
        color: "#1e40af",
        gradient: "from-blue-700 to-indigo-900",
        type: 'service'
    },
    "Courier Services": {
        icon: CourierIcon,
        color: "#2563eb",
        gradient: "from-blue-500 to-blue-700",
        type: 'service'
    },
    "Solar Panel Service": {
        icon: Sun,
        color: "#f59e0b",
        gradient: "from-amber-400 to-orange-500",
        type: 'service'
    },
    "CCTV Installation": {
        icon: Shield,
        color: "#3b82f6",
        gradient: "from-blue-500 to-indigo-700",
        type: 'service'
    },
    "Water Tank Cleaning": {
        icon: WaterTankIcon,
        color: "#0284c7",
        gradient: "from-sky-600 to-blue-800",
        type: 'service'
    },
    "Home Automation": {
        icon: HomeAutoIcon,
        color: "#6366f1",
        gradient: "from-indigo-400 to-purple-600",
        type: 'service'
    },
    "Glass Work": {
        icon: GlassIcon,
        color: "#64748b",
        gradient: "from-slate-400 to-slate-600",
        type: 'service'
    },
    "Tiffin Service": {
        icon: TiffinIcon,
        color: "#f59e0b",
        gradient: "from-amber-400 to-orange-600",
        type: 'service'
    },
    "Physiotherapy": {
        icon: PhysioIcon,
        color: "#ef4444",
        gradient: "from-red-400 to-rose-600",
        type: 'service'
    },
    "Yoga Trainer": {
        icon: YogaIcon,
        color: "#10b981",
        gradient: "from-emerald-400 to-green-600",
        type: 'service'
    },
    "Pet Grooming": {
        icon: PetGroomingIcon,
        color: "#c026d3",
        gradient: "from-fuchsia-500 to-purple-800",
        type: 'service'
    },
    "Car Wash": {
        icon: CarWashIcon,
        color: "#3b82f6",
        gradient: "from-blue-400 to-blue-700",
        type: 'service'
    },
    "Dry Cleaning": {
        icon: DryCleaningIcon,
        color: "#0891b2",
        gradient: "from-cyan-600 to-indigo-700",
        type: 'service'
    },
    "Other Services": {
        icon: OtherIcon,
        color: "#64748b",
        gradient: "from-slate-400 to-slate-600",
        type: 'service'
    },
    "Others": {
        icon: OtherIcon,
        color: "#f43f5e",
        gradient: "from-rose-400 to-rose-600",
        type: 'product'
    }
};
