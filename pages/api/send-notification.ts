import type { NextApiRequest, NextApiResponse } from 'next'

type NotificationType = 'availability' | 'status' | 'startup' | 'error'

interface NotificationRequest {
    message: string
    url?: string | null
    type?: NotificationType
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const { message, url, type = 'status' } = req.body as NotificationRequest

    try {
        // Haal configuratie uit cookies
        const token = req.cookies['telegram_token']
        const chatId = req.cookies['telegram_chat_id']
        const isEnabled = req.cookies['telegram_enabled'] === 'true'

        // Als Telegram niet is ingeschakeld, return success maar stuur geen bericht
        if (!isEnabled) {
            return res.status(200).json({ 
                success: true, 
                message: 'Telegram notifications are disabled' 
            })
        }

        // Als configuratie mist terwijl notifications enabled zijn
        if (!token || !chatId) {
            console.warn('Telegram configuration incomplete but notifications enabled')
            return res.status(200).json({ 
                success: false, 
                message: 'Telegram configuration incomplete' 
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
            case 'error':
                formattedMessage = `❌ ${message}`
                break
            case 'startup':
                formattedMessage = `🟢 ${message}`
                break
        }

        // Voeg URL toe als die er is
        if (url) {
            formattedMessage += `\n\n${url}`
        }

        // Verstuur naar Telegram
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
            throw new Error(`Telegram API error: ${response.status}`)
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error sending notification:', error)
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to send notification' 
        })
    }
} 