
import { Apartment, MenuItem } from './types';

export const APARTMENTS: Apartment[] = [
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
    images: ['https://picsum.photos/seed/apt1/800/600', 'https://picsum.photos/seed/apt1-2/800/600'],
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
    images: ['https://picsum.photos/seed/apt2/800/600', 'https://picsum.photos/seed/apt2-2/800/600'],
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
    images: ['https://picsum.photos/seed/apt3/800/600', 'https://picsum.photos/seed/apt3-2/800/600'],
    isAvailable: true
  }
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Pepper Soup (Catfish)',
    category: 'Soups',
    description: 'Traditional Nigerian spicy soup with fresh catfish and local herbs.',
    price: 4500,
    image: 'https://picsum.photos/seed/soup1/400/400',
    isSpicy: true
  },
  {
    id: 'm2',
    name: 'Jollof Rice Special',
    category: 'Rice & Swallow',
    description: 'Smoky party jollof served with fried plantain and your choice of protein.',
    price: 3800,
    image: 'https://picsum.photos/seed/rice1/400/400'
  },
  {
    id: 'm3',
    name: 'Pounded Yam & Egusi',
    category: 'Rice & Swallow',
    description: 'Smooth pounded yam with rich egusi soup containing assorted meat.',
    price: 5200,
    image: 'https://picsum.photos/seed/swallow1/400/400'
  },
  {
    id: 'm4',
    name: 'Chapman Deluxe',
    category: 'Drinks',
    description: 'Our signature Nigerian cocktail with a twist of fresh cucumber and lemon.',
    price: 2500,
    image: 'https://picsum.photos/seed/drink1/400/400'
  }
];
