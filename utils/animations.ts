import { Variants } from 'framer-motion';

// Fade in animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5, ease: "easeInOut" }
  }
};

// Slide up animation variants
export const slideUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// Stagger container for multiple children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// Stagger item for children of stagger container
export const staggerItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

// Scale animation variants
export const scale: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

// Hover lift animation
export const hoverLift = {
  y: -10,
  scale: 1.02,
  transition: { duration: 0.2, ease: "easeOut" }
};

// Button tap animation
export const buttonTap = {
  scale: 0.95,
  transition: { duration: 0.1 }
};

// Card hover with 3D effect
export const cardHover = {
  y: -15,
  scale: 1.05,
  rotateX: 5,
  rotateY: -5,
  boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 15px 30px rgba(59, 130, 246, 0.4)',
  transition: { duration: 0.3 }
};

// Notification slide in from bottom
export const notificationSlide: Variants = {
  hidden: { 
    opacity: 0, 
    y: '100%' 
  },
  visible: { 
    opacity: 1, 
    y: '0%',
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: '100%',
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

// Geometric background animations
export const geometricShape1 = {
  scale: [1, 1.05, 1],
  rotate: [0, 5, 0],
  x: ['-50%', '-45%', '-50%'],
  y: ['-40%', '-35%', '-40%'],
  transition: {
    duration: 40,
    repeat: Infinity,
    ease: 'easeInOut',
  }
};

export const geometricShape2 = {
  scale: [1, 0.95, 1],
  rotate: [0, -5, 0],
  x: ['40%', '45%', '40%'],
  y: ['40%', '45%', '40%'],
  transition: {
    duration: 35,
    repeat: Infinity,
    ease: 'easeInOut',
  }
};

export const geometricShape3 = {
  x: ['-10%', '10%', '-10%'],
  y: ['-10%', '10%', '-10%'],
  scale: [0.8, 1.2, 0.8],
  transition: {
    duration: 25,
    repeat: Infinity,
    ease: 'linear',
  }
};

// Page transition variants
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};
