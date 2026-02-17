import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bed, Users, Square, Wifi, Wind, ChevronRight, ChevronLeft } from 'lucide-react';
import { Apartment } from '../types';

interface Props {
  apartment: Apartment;
}

const ApartmentCard: React.FC<Props> = ({ apartment }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % apartment.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + apartment.images.length) % apartment.images.length);
  };

  return (
    <div className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col">
      {/* Interactive Carousel Section */}
      <div className="relative h-72 overflow-hidden bg-gray-200">
        <div 
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {apartment.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`${apartment.name} - view ${idx + 1}`}
              className="w-full h-full object-cover shrink-0"
            />
          ))}
        </div>

        {/* Carousel Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Badge */}
        <div className="absolute top-5 left-5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10">
          {apartment.type}
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-5 right-5 bg-white/95 backdrop-blur shadow-2xl px-5 py-2.5 rounded-2xl z-10 flex flex-col items-end">
          <span className="text-xl font-bold text-emerald-900 leading-none">₦{apartment.pricePerNight.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">/ Night</span>
        </div>

        {/* Navigation Buttons (Desktop Hover) */}
        {apartment.images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-emerald-900 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-900 hover:text-white z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-emerald-900 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-900 hover:text-white z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Pagination Indicators */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex space-x-1.5 z-20">
              {apartment.images.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Content Section */}
      <div className="p-8 flex flex-col flex-grow">
        <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-emerald-700 transition-colors font-serif leading-tight">
          {apartment.name}
        </h3>
        <p className="text-sm text-gray-500 mb-8 line-clamp-2 leading-relaxed">
          {apartment.description}
        </p>
        
        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100/50 group/item hover:bg-emerald-50 hover:border-emerald-100 transition-colors">
            <Users className="w-5 h-5 text-emerald-600 mb-1.5 group-hover/item:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-gray-900">{apartment.maxGuests} Guests</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100/50 group/item hover:bg-emerald-50 hover:border-emerald-100 transition-colors">
            <Bed className="w-5 h-5 text-emerald-600 mb-1.5 group-hover/item:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-gray-900">King Bed</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100/50 group/item hover:bg-emerald-50 hover:border-emerald-100 transition-colors">
            <Square className="w-5 h-5 text-emerald-600 mb-1.5 group-hover/item:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-gray-900">{apartment.size}m² Area</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
          <div className="flex space-x-4">
            <Wifi className="w-5 h-5 text-emerald-600/30" title="High-speed Wi-Fi" />
            <Wind className="w-5 h-5 text-emerald-600/30" title="Climate Control" />
          </div>
          <Link
            to={`/apartments/${apartment.slug}`}
            className="group/btn flex items-center space-x-2 text-sm font-bold text-emerald-900 hover:text-emerald-600 transition-all"
          >
            <span className="border-b-2 border-emerald-900 group-hover/btn:border-emerald-600">Reserve Room</span>
            <ChevronRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ApartmentCard;