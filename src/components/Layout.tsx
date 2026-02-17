import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Phone, MessageSquare } from 'lucide-react';
import { HOTEL_CONFIG } from '@/config/cars.config';

interface LayoutProps {
  children?: React.ReactNode;
  simpleHeader?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, simpleHeader }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Special layout for Guest Hub to minimize distractions
  if (simpleHeader) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <header className="fixed w-full z-40 transition-all duration-300 bg-white/90 backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <Link to="/" className="flex flex-col">
                <span className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
                  {HOTEL_CONFIG.business_name}
                </span>
              </Link>
              <Link to="/" className="text-sm font-bold text-emerald-900 hover:underline">Exit Guest Hub</Link>
            </div>
          </div>
        </header>
        <main className="pt-24 animate-fade-in">
          {children}
        </main>
      </div>
    )
  }

  // Lean navigation for Hotel v1
  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    // Restaurant link kept optional/hidden in main nav if we want strictly hotel focus
    // { name: 'Dining', path: '/restaurant', icon: Utensils },
    { name: 'Contact', path: '#contact', icon: Phone },
  ];

  useEffect(() => setIsMenuOpen(false), [location]);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="text-2xl font-serif font-bold tracking-tight text-emerald-900 group-hover:text-emerald-700 transition-colors">
              {HOTEL_CONFIG.business_name.split(' ')[0]}
            </span>
            <span className="hidden sm:inline-block text-xs font-medium uppercase tracking-widest text-emerald-600 mt-1">
              {HOTEL_CONFIG.business_type}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-sm font-bold text-gray-500 hover:text-emerald-900 transition-colors uppercase tracking-wider text-[11px]"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-emerald-900 hover:bg-emerald-50 rounded-full transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <a
              href={`https://wa.me/${HOTEL_CONFIG.channels.whatsapp_numbers.frontdesk}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center space-x-2 px-5 py-2.5 bg-emerald-900 text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 hover:-translate-y-0.5 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Us</span>
            </a>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 animate-slide-down absolute w-full shadow-2xl">
            <div className="px-4 py-6 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.path}
                  className="flex items-center space-x-4 p-4 rounded-xl hover:bg-emerald-50 text-gray-700 font-bold"
                >
                  <link.icon className="w-5 h-5 text-emerald-600" />
                  <span>{link.name}</span>
                </a>
              ))}
              <a
                href={`https://wa.me/${HOTEL_CONFIG.channels.whatsapp_numbers.frontdesk}`}
                className="flex items-center justify-center space-x-2 w-full py-4 mt-4 bg-emerald-900 text-white rounded-xl font-bold shadow-xl"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-16">
        {children}
      </main>

      <footer className="bg-gray-900 text-white pt-16 pb-8 border-t border-gray-800" id="contact">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold">{HOTEL_CONFIG.business_name}</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Premium hospitality experience in {HOTEL_CONFIG.location}.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-emerald-500">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {HOTEL_CONFIG.channels.phone && (
                <li className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{HOTEL_CONFIG.channels.phone}</span>
                </li>
              )}
              <li className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Available</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-emerald-500">Location</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              {HOTEL_CONFIG.location}
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-gray-800 text-center text-xs text-gray-600 font-medium">
          © {new Date().getFullYear()} {HOTEL_CONFIG.business_name}. Powered by CARSS Engine.
        </div>
      </footer>
    </div>
  );
};

export default Layout;