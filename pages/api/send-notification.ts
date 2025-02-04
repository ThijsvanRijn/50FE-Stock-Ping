import type { NextApiRequest, NextApiResponse } from 'next'

type NotificationType = 'availability' | 'status' | 'startup' | 'error'

interface NotificationRequest {
    message: string
    url?: string | null
    type: NotificationType
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const { message, url, type } = req.body as NotificationRequest

    try {
        // Haal bot configuratie op uit environment variables
        const token = process.env.TELEGRAM_BOT_TOKEN
        const chatId = process.env.TELEGRAM_CHAT_ID

        if (!token || !chatId) {
            throw new Error('Telegram configuration missing')
        }

        // Check of de bot enabled is in localStorage
        const isEnabled = req.cookies['telegram_enabled'] === 'true'
        if (!isEnabled) {
            return res.status(200).json({ 
                success: false, 
                message: 'Telegram notifications are disabled' 
            })
        }

        let formattedMessage = message

        // Voeg emoji's toe op basis van type
        switch (type) {
            case 'availability':
                formattedMessage = `🚨 ${message}`
                break
            case 'status':
                formattedMessage = `ℹ️ ${message}`
                break
            case 'startup':
                formattedMessage = `🟢 ${message}`
                break
            case 'error':
                formattedMessage = `❌ ${message}`
                break
        }

        // Voeg URL toe als die er is
        if (url) {
            formattedMessage += `\n\n${url}`
        }

        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: formattedMessage,
                    parse_mode: 'HTML'
                })
            }
        )

        if (!response.ok) {
            throw new Error('Failed to send Telegram message')
        }

        res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error sending notification:', error)
        res.status(500).json({ success: false, error: 'Failed to send notification' })
    }
} 