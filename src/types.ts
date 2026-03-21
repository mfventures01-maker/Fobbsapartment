
export type RoomType = 'Studio' | '1-Bedroom' | '2-Bedroom' | 'Penthouse';

export interface Apartment {
  id: string;
  name: string;
  slug: string;
  type: RoomType;
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
  category: 'Breakfast' | 'Soups' | 'Rice & Swallow' | 'Proteins' | 'Drinks' | 'Sides';
  description: string;
  price: number;
  image: string;
  isSpicy?: boolean;
  isVegetarian?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface BookingData {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType?: RoomType;
  apartmentId?: string;
  promoCode?: string;
}

export interface GuestDetails {
  fullName: string;
  email: string;
  phone: string;
  requests: string;
}
