
export interface Room {
    id: string;
    name: string;
    slug: string;
    type: string;
    description: string;
    maxGuests: number;
    size: number;
    pricePerNight: number;
    amenities: string[];
    images: string[];
    isAvailable: boolean;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
}

export interface Review {
    name: string;
    city: string;
    rating: number;
    text: string;
}

export interface ServiceItem {
    key: string;
    title: string;
    description: string;
    image_url: string;
    route_target: string;
}

export interface ServiceSection {
    title: string;
    subtitle: string;
    items: ServiceItem[];
}

export interface RestaurantSection {
    title: string;
    subtitle: string;
    hero_image_url: string;
    highlights: string[];
    cta_text: string;
    cta_route: string;
}

export interface DeploymentConfig {
    business_name: string;
    business_id: string;
    business_code: string;
    business_type: "hotel" | "restaurant" | "lounge";
    location: string;
    hero_image: string;
    channels: {
        whatsapp_numbers: {
            frontdesk: string;
            kitchen: string;
            manager: string;
        };
        telegram_handle?: string;
        telegram_url?: string;
        phone?: string;
        email?: string;
    };
    policy: {
        checkInTime: string;
        checkOutTime: string;
    };
    rooms: Room[];
    hotel: {
        guest_hub: { enabled: boolean };
        room_service: {
            enabled: boolean;
            routing: "frontdesk" | "kitchen" | "manager";
            hours: { start: string; end: string };
            notes_hint: string;
            menu: MenuItem[];
        };
        housekeeping: {
            enabled: boolean;
            routing: "frontdesk" | "kitchen" | "manager";
            notes_hint: string;
            requests: { id: string; label: string }[];
        };
        issues: {
            enabled: boolean;
            notes_hint: string;
            categories: { id: string; label: string; routing: "frontdesk" | "kitchen" | "manager" }[];
        };
        addons: {
            enabled: boolean;
            notes_hint: string;
            items: { id: string; label: string; price: number; routing: "frontdesk" | "kitchen" | "manager" }[];
        };
        payments: {
            enabled: boolean;
            methods: string[];
            transfer: {
                bank: string;
                account_name: string;
                account_number: string;
            };
            note: string;
        };
        bar: {
            enabled: boolean;
            menu: MenuItem[];
        };
    };
    restaurant_section?: RestaurantSection;
    services_section?: ServiceSection;
    reviews?: Review[];
}

export const HOTEL_CONFIG: DeploymentConfig = {
    business_name: "Fobbs Apartments",
    business_id: "fobbs-asaba-001",
    business_code: "FOBBS",
    business_type: "hotel",
    location: "Asaba Central District, Delta State",
    hero_image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80",
    channels: {
        whatsapp_numbers: {
            frontdesk: "2347048033575",
            kitchen: "2347048033575",
            manager: "2347048033575"
        },
        telegram_handle: "Captlee77",
        telegram_url: "https://t.me/Captlee77",
        phone: "0704 803 3575",
        email: "reservations@fobbsapartments.com"
    },
    policy: {
        checkInTime: "14:00",
        checkOutTime: "12:00"
    },
    rooms: [
        {
            id: 'apt-1',
            name: 'Executive Studio Suite',
            slug: 'executive-studio',
            type: 'Studio',
            description: 'A modern, light-filled studio perfect for solo business travelers or couples. Features high ceilings and premium bedding.',
            maxGuests: 2,
            size: 35,
            pricePerNight: 18500,
            amenities: ['Kitchen', 'Wi-Fi', 'AC', 'Smart TV', 'Workspace'],
            images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1280&q=80', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1280&q=80'],
            isAvailable: true
        },
        {
            id: 'apt-2',
            name: 'Premier One-Bedroom Apartment',
            slug: 'premier-one-bedroom',
            type: '1-Bedroom',
            description: 'Spacious living room paired with a private master bedroom. Includes a fully equipped kitchen and dining area.',
            maxGuests: 3,
            size: 55,
            pricePerNight: 32000,
            amenities: ['Kitchen', 'Wi-Fi', 'AC', 'Smart TV', 'Balcony', 'Washing Machine'],
            images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1280&q=80', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1280&q=80'],
            isAvailable: true
        },
        {
            id: 'apt-3',
            name: 'Family Two-Bedroom Suite',
            slug: 'family-two-bedroom',
            type: '2-Bedroom',
            description: 'Perfect for families or small groups. Two en-suite bedrooms with a large shared living space and balcony.',
            maxGuests: 5,
            size: 85,
            pricePerNight: 55000,
            amenities: ['Kitchen', 'Wi-Fi', 'AC', 'Smart TV', 'Balcony', 'Dining Area'],
            images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1280&q=80', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1280&q=80'],
            isAvailable: true
        }
    ],
    hotel: {
        guest_hub: { enabled: true },

        room_service: {
            enabled: true,
            routing: "kitchen",
            hours: { start: "06:00", end: "23:00" },
            notes_hint: "Any allergies or special instructions?",
            menu: [
                { id: "akara_pap", name: "Akara + Pap", price: 2500, category: "Breakfast" },
                { id: "tea_bread", name: "Tea + Bread + Omelette", price: 3000, category: "Breakfast" },
                { id: "jollof_chicken", name: "Jollof Rice + Chicken", price: 8500, category: "Meals" },
                { id: "friedrice_turkey", name: "Fried Rice + Turkey", price: 9500, category: "Meals" },
                { id: "egusi_swallow", name: "Egusi Soup + Swallow", price: 9000, category: "Meals" },
                { id: "pepper_soup", name: "Pepper Soup", price: 6500, category: "Meals" },
                { id: "suya_platter", name: "Suya Platter", price: 8000, category: "Grills" },
                { id: "water", name: "Bottled Water", price: 500, category: "Drinks" },
                { id: "soft_drink", name: "Soft Drink", price: 800, category: "Drinks" },
                { id: "malt", name: "Malt", price: 1200, category: "Drinks" },
                { id: "juice", name: "Fruit Juice", price: 2000, category: "Drinks" },
                { id: "ice_bucket", name: "Ice Bucket", price: 1000, category: "Extras" },
                { id: "cutlery", name: "Extra Cutlery", price: 0, category: "Extras" }
            ]
        },

        housekeeping: {
            enabled: true,
            routing: "frontdesk",
            notes_hint: "Any preferred time or instructions?",
            requests: [
                { id: "clean_room", label: "Clean My Room" },
                { id: "extra_towels", label: "Extra Towels" },
                { id: "bedsheets_change", label: "Change Bed Sheets" },
                { id: "toiletries_refill", label: "Toiletries Refill (Soap/Tissue/Toothpaste)" },
                { id: "water_refill", label: "Water Refill" },
                { id: "trash_pickup", label: "Trash Pickup" },
                { id: "laundry_pickup", label: "Laundry Pickup" },
                { id: "do_not_disturb", label: "Do Not Disturb" }
            ]
        },

        issues: {
            enabled: true,
            notes_hint: "Describe the issue briefly (e.g., AC blowing hot air).",
            categories: [
                { id: "ac", label: "AC Not Cooling", routing: "manager" },
                { id: "wifi", label: "WiFi Issue", routing: "frontdesk" },
                { id: "power", label: "Power / Generator Issue", routing: "manager" },
                { id: "tv", label: "TV / Decoder Issue", routing: "frontdesk" },
                { id: "hot_water", label: "No Hot Water", routing: "manager" },
                { id: "plumbing", label: "Bathroom / Plumbing Issue", routing: "manager" },
                { id: "noise", label: "Noise Complaint", routing: "manager" },
                { id: "lock_key", label: "Door / Key / Lock Issue", routing: "frontdesk" }
            ]
        },

        addons: {
            enabled: true,
            notes_hint: "Any specifics? (pickup time, items, etc.)",
            items: [
                { id: "late_checkout", label: "Late Checkout", price: 5000, routing: "frontdesk" },
                { id: "airport_pickup", label: "Airport Pickup", price: 0, routing: "manager" },
                { id: "city_trip", label: "City Trip / Driver", price: 0, routing: "manager" },
                { id: "laundry_service", label: "Laundry Service", price: 0, routing: "frontdesk" },
                { id: "minibar_restock", label: "Mini Bar Restock", price: 0, routing: "frontdesk" },
                { id: "car_wash", label: "Car Wash", price: 0, routing: "manager" },
                { id: "extra_pillow", label: "Extra Pillow", price: 0, routing: "frontdesk" },
                { id: "ice_bucket", label: "Ice Bucket", price: 1000, routing: "frontdesk" }
            ]
        },

        payments: {
            enabled: true,
            methods: ["transfer", "ussd", "pos", "pay_on_delivery"],
            transfer: {
                bank: "Access Bank",
                account_name: "FOBBS APARTMENTS",
                account_number: "0123456789"
            },
            note: "For POS payments, please pay at the front desk and reference your Order/Request ID. For transfer, send proof of payment to the front desk WhatsApp."
        },
        bar: {
            enabled: true,
            menu: [
                { id: "chapman", name: "Classic Chapman", price: 2500, category: "Cocktails" },
                { id: "mojito", name: "Mojito", price: 3000, category: "Cocktails" },
                { id: "hennessy", name: "Hennessy VS", price: 3500, category: "Spirits" },
                { id: "vodka", name: "Absolut Vodka", price: 3000, category: "Spirits" },
                { id: "red_wine", name: "Merlot Red Wine", price: 4000, category: "Wine" },
                { id: "white_wine", name: "Chardonnay", price: 4000, category: "Wine" },
                { id: "heineken", name: "Heineken", price: 1000, category: "Beer" },
                { id: "star", name: "Star Radler", price: 800, category: "Beer" },
                { id: "coke", name: "Coca Cola", price: 500, category: "Soft Drinks" },
                { id: "sprite", name: "Sprite", price: 500, category: "Soft Drinks" }
            ]
        }
    },
    restaurant_section: {
        title: "Culinary Delight",
        subtitle: "Experience local flavors and continental classics.",
        hero_image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=80",
        highlights: ["Freshly sourced ingredients", "24/7 Room Service", "Expert Chefs"],
        cta_text: "Order Now",
        cta_route: "/restaurant"
    },
    services_section: {
        title: "At Your Service",
        subtitle: "Everything you need for a comfortable stay.",
        items: [
            {
                key: "dining",
                title: "In-Room Dining",
                description: "Enjoy delicious meals delivered straight to your door.",
                image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1600&q=80",
                route_target: "/restaurant"
            },
            {
                key: "transport",
                title: "Chauffeur Service",
                description: "Seamless airport pickups and city trips.",
                image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
                route_target: "/services/transport"
            },
            {
                key: "housekeeping",
                title: "Housekeeping",
                description: "Fresh towels, cleaning, and more on demand.",
                image_url: "https://cdn.pixabay.com/photo/2017/08/07/16/56/room-2601350_1280.jpg",
                route_target: "/services/cleaning"
            },
        ]
    },
    reviews: [
        {
            name: "Chidera A.",
            city: "Asaba",
            rating: 5,
            text: "Check-in was smooth. Room service came fast. Felt premium.",
        },
        {
            name: "Tunde O.",
            city: "Lagos",
            rating: 5,
            text: "Clean rooms, steady support. The QR ordering is genius.",
        },
        {
            name: "Amaka N.",
            city: "Abuja",
            rating: 4,
            text: "Great stay. I like that I could request towels without calling.",
        },
    ]
};
