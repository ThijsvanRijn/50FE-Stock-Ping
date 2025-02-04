// Geluid optimalisatie
export const playSound = () => {
    if (typeof window !== "undefined") {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(err => console.error('Error playing sound:', err));
    }
}; 