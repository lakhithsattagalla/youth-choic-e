import React from 'react';
import { MessageSquare } from 'lucide-react';

export const FloatingCallButton: React.FC = () => {
    return (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col space-y-3">
            {/* WhatsApp Quick Chat Floating Button */}
            <a
                href="https://wa.me/918522000504?text=Hello%20Youth%20Choice%20Mens%20Wear!%20I%20have%20an%20inquiry."
                target="_blank"
                rel="noreferrer"
                className="group bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-emerald-500/30 flex items-center space-x-2 transition-all hover:scale-110 active:scale-95 border border-emerald-300/40"
                title="WhatsApp Support"
            >
                <MessageSquare className="w-5 h-5 fill-black" />
                <span className="hidden sm:inline text-xs uppercase tracking-wider font-extrabold">
                    WhatsApp
                </span>
            </a>
        </div>
    );
};
