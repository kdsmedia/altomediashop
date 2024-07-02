module.exports = {
    db: {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'altomedia'
    },
    whatsappApiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.PHONE_NUMBER_ID,
    whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    qrCodeUrl: process.env.QR_CODE_URL
};
