'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export const InstitutionalFooter: React.FC = () => {
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <>
      <footer className="bg-[#FAF7F2] dark:bg-[#121B17] border-t border-[#E8E2D5] dark:border-[#24342C] pt-14 pb-12 px-4 sm:px-8 text-xs text-[#5C7067] dark:text-[#9FB1A9] transition-colors">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Main Footer 5-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            {/* 1. Brand Statement */}
            <div className="lg:col-span-1 space-y-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-[#143D32] dark:bg-[#205244] flex items-center justify-center text-white font-serif font-bold text-base shadow-2xs">
                  M
                </div>
                <span className="font-serif font-bold text-[#182C24] dark:text-[#F3F7F5] text-base">
                  MindBridge
                </span>
              </Link>
              <p className="text-xs text-[#70847B] dark:text-[#8E9F98] leading-relaxed">
                A student well-being initiative by your university.
              </p>
            </div>

            {/* 2. Explore Column */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-[#182C24] dark:text-[#F3F7F5]">
                Explore
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/chat" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Talk &amp; Reflect
                  </Link>
                </li>
                <li>
                  <Link href="/screening" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Self-Assessment
                  </Link>
                </li>
                <li>
                  <Link href="/booking" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Counseling
                  </Link>
                </li>
                <li>
                  <Link href="/resources" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Resources
                  </Link>
                </li>
              </ul>
            </div>

            {/* 3. Learn More Column */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-[#182C24] dark:text-[#F3F7F5]">
                Learn More
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>

            {/* 4. Get Help Column */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-[#182C24] dark:text-[#F3F7F5]">
                Get Help
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/support-now" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Crisis Resources
                  </Link>
                </li>
                <li>
                  <Link href="/support-now" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    Emergency Contacts
                  </Link>
                </li>
                <li>
                  <Link href="/support-now" className="hover:text-[#143D32] dark:hover:text-[#F3F7F5] transition-colors focus-accessible">
                    24/7 Helplines
                  </Link>
                </li>
              </ul>
            </div>

            {/* 5. Contact CTA */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-[#182C24] dark:text-[#F3F7F5]">
                We&apos;re here for you
              </h4>
              <p className="text-xs text-[#70847B] dark:text-[#8E9F98]">
                Whenever you feel ready.
              </p>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#143D32] hover:bg-[#1B4E40] text-white shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer focus-accessible"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Contact Support</span>
              </button>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Socials */}
          <div className="pt-8 border-t border-[#E8E2D5] dark:border-[#24342C] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#7A8E85] dark:text-[#7D9188]">
            <p>
              &copy; {new Date().getFullYear()} MindBridge. All rights reserved.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-[#5C7067] dark:text-[#9FB1A9]">
              {/* Instagram */}
              <a href="#instagram" aria-label="Instagram" className="hover:text-[#143D32] dark:hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              {/* Facebook */}
              <a href="#facebook" aria-label="Facebook" className="hover:text-[#143D32] dark:hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              {/* Twitter / X */}
              <a href="#twitter" aria-label="Twitter / X" className="hover:text-[#143D32] dark:hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </a>
              {/* YouTube */}
              <a href="#youtube" aria-label="YouTube" className="hover:text-[#143D32] dark:hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
              {/* Podcast / Globe */}
              <a href="#podcast" aria-label="Audio Resources" className="hover:text-[#143D32] dark:hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Quick Contact Modal */}
      {showSupportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-page-enter"
        >
          <div className="bg-[#FAF8F5] dark:bg-[#18231F] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E8E2D5] dark:border-[#263730] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="contact-modal-title" className="font-serif text-lg font-bold text-[#182C24] dark:text-[#F3F7F5]">
                MindBridge Student Support
              </h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1 text-[#64736C] hover:text-[#22302A] dark:hover:text-white rounded-lg focus-accessible cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#5C7067] dark:text-[#9FB1A9] leading-relaxed">
              Reach out to campus counseling, mental health coordinators, or peer listening guides. All inquiries remain confidential.
            </p>

            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-2xl bg-white dark:bg-[#141C19] border border-[#ECE5D8] dark:border-[#24332C]">
                <p className="font-semibold text-xs text-[#182C24] dark:text-[#F3F7F5]">Campus Care Desk</p>
                <p className="text-[11px] text-[#5C7067] dark:text-[#9FB1A9]">support@mindbridge.edu • Mon–Fri, 9am–6pm</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FFF6EE] dark:bg-[#281810] border border-[#FADCC7] dark:border-[#44281A]">
                <p className="font-semibold text-xs text-[#9E3E18] dark:text-[#F8B699]">24/7 Tele-MANAS Helpline</p>
                <p className="text-[11px] text-[#B8572D] dark:text-[#ECC2AE]">14416 / 1800-891-4416 (Toll-Free, Immediate)</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#143D32] hover:bg-[#1E4D40] text-white transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
