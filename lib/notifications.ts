export const sendTelegramNotification = async (message: string, url: string | null) => {
    const token = localStorage.getItem("telegram_token");
    const chatId = localStorage.getItem("telegram_chat_id");
    const enabled = localStorage.getItem("telegram_enabled") === "true";

    if (token && chatId && enabled) {
        try {
            await fetch('/api/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, url })
            });
        } catch (err) {
            console.error('Error sending notification:', err);
        }
    }
}; 