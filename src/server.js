const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mysql = require('mysql2');
const config = require('./config');

// Setup Express app
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setup MySQL connection
const db = mysql.createConnection(config.db);
db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL database.');
});

// Handle incoming messages
app.post('/webhook', async (req, res) => {
    const message = req.body.entry[0].changes[0].value.messages[0];
    const from = message.from;

    if (message.type === 'text') {
        const text = message.text.body;

        if (text.toLowerCase() === 'halo') {
            await sendWelcomeMessage(from);
        } else if (text.toLowerCase().startsWith('detail ')) {
            const productId = text.split(' ')[1];
            await sendProductDetails(from, productId);
        } else if (text.toLowerCase().startsWith('beli ')) {
            const [_, productId, quantity] = text.split(' ');
            await handlePurchase(from, productId, quantity);
        } else {
            await sendErrorMessage(from);
        }
    }

    res.sendStatus(200);
});

// Send a welcome message with 6 products
const sendWelcomeMessage = async (to) => {
    const products = [
        { id: 1, name: 'Produk 1', price: 100000, image: 'https://example.com/image1.jpg' },
        { id: 2, name: 'Produk 2', price: 200000, image: 'https://example.com/image2.jpg' },
        { id: 3, name: 'Produk 3', price: 300000, image: 'https://example.com/image3.jpg' },
        { id: 4, name: 'Produk 4', price: 400000, image: 'https://example.com/image4.jpg' },
        { id: 5, name: 'Produk 5', price: 500000, image: 'https://example.com/image5.jpg' },
        { id: 6, name: 'Produk 6', price: 600000, image: 'https://example.com/image6.jpg' }
    ];

    const body = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
            name: 'product_list',
            language: { code: 'id' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: 'Selamat datang di ALTOMEDIA, kami menyediakan produk media sosial di bawah ini:' }
                    ]
                },
                {
                    type: 'button',
                    buttons: products.map(product => ({
                        type: 'reply',
                        reply: { id: product.id.toString(), title: product.name }
                    }))
                }
            ]
        }
    };

    return axios.post(`https://graph.facebook.com/v16.0/${config.phoneNumberId}/messages`, body, {
        headers: {
            'Authorization': `Bearer ${config.whatsappApiToken}`,
            'Content-Type': 'application/json'
        }
    })
    .catch(error => console.error('Error sending welcome message:', error));
};

// Send product details based on product ID
const sendProductDetails = async (to, productId) => {
    const products = [
        { id: 1, name: 'Produk 1', price: 100000, image: 'https://example.com/image1.jpg' },
        { id: 2, name: 'Produk 2', price: 200000, image: 'https://example.com/image2.jpg' },
        { id: 3, name: 'Produk 3', price: 300000, image: 'https://example.com/image3.jpg' },
        { id: 4, name: 'Produk 4', price: 400000, image: 'https://example.com/image4.jpg' },
        { id: 5, name: 'Produk 5', price: 500000, image: 'https://example.com/image5.jpg' }
    ];

    const product = products.find(p => p.id == productId);
    if (product) {
        return axios.post(`https://graph.facebook.com/v16.0/${config.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: 'product_detail',
                language: { code: 'id' },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: `Nama Produk: ${product.name}` },
                            { type: 'text', text: `Harga: Rp${product.price}` },
                            { type: 'text', text: `Silakan pilih jumlah produk:` }
                        ]
                    },
                    {
                        type: 'button',
                        buttons: [
                            {
                                type: 'reply',
                                reply: { id: `beli_${product.id}_1`, title: `Beli 1` }
                            },
                            {
                                type: 'reply',
                                reply: { id: `beli_${product.id}_2`, title: `Beli 2` }
                            },
                            {
                                type: 'reply',
                                reply: { id: `beli_${product.id}_3`, title: `Beli 3` }
                            },
                            {
                                type: 'reply',
                                reply: { id: `beli_${product.id}_4`, title: `Beli 4` }
                            },
                            {
                                type: 'reply',
                                reply: { id: `beli_${product.id}_5`, title: `Beli 5` }
                            }
                        ]
                    }
                ]
            }
        }, {
            headers: {
                'Authorization': `Bearer ${config.whatsappApiToken}`,
                'Content-Type': 'application/json'
            }
        })
        .catch(error => console.error('Error sending product details:', error));
    } else {
        console.error('Product not found:', productId);
    }
};

// Handle purchase based on product ID and quantity
const handlePurchase = async (to, productId, quantity) => {
    const products = [
        { id: 1, name: 'Produk 1', price: 100000, image: 'https://example.com/image1.jpg' },
        { id: 2, name: 'Produk 2', price: 200000, image: 'https://example.com/image2.jpg' },
        { id: 3, name: 'Produk 3', price: 300000, image: 'https://example.com/image3.jpg' },
        { id: 4, name: 'Produk 4', price: 400000, image: 'https://example.com/image4.jpg' },
        { id: 5, name: 'Produk 5', price: 500000, image: 'https://example.com/image5.jpg' }
    ];

    const product = products.find(p => p.id == productId);
    if (product) {
        const totalPrice = product.price * quantity;
        // Insert order into the database
        db.query('INSERT INTO orders (product_id, quantity, total_price) VALUES (?, ?, ?)', [productId, quantity, totalPrice], (err, results) => {
            if (err) throw err;
            console.log('Order inserted into database:', results);
        });

        return axios.post(`https://graph.facebook.com/v16.0/${config.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: 'purchase_summary',
                language: { code: 'id' },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: `Nama Produk: ${product.name}` },
                            { type: 'text', text: `Harga: Rp${product.price}` },
                            { type: 'text', text: `Jumlah: ${quantity}` },
                            { type: 'text', text: `Total Harga: Rp${totalPrice}` },
                            { type: 'text', text: `Silakan lakukan pembayaran ke rekening berikut:` },
                            { type: 'text', text: `QR Code:` },
                            { type: 'text', text: `${config.qrCodeUrl}` },
                            { type: 'text', text: `Rekening: 1234567890` },
                            { type: 'text', text: `Petunjuk Pembayaran:` },
                            { type: 'text', text: `1. Scan QR Code di atas.` },
                            { type: 'text', text: `2. Transfer sesuai dengan total harga.` },
                            { type: 'text', text: `3. Konfirmasi pembayaran setelah transfer.` }
                        ]
                    }
                ]
            }
        }, {
            headers: {
                'Authorization': `Bearer ${config.whatsappApiToken}`,
                'Content-Type': 'application/json'
            }
        })
        .catch(error => console.error('Error handling purchase:', error));
    } else {
        console.error('Product not found:', productId);
    }
};

// Handle errors
const sendErrorMessage = async (to) => {
    return axios.post(`https://graph.facebook.com/v16.0/${config.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: 'Maaf, perintah tidak dikenali. Silakan ketik "halo" untuk memulai.' }
    }, {
        headers: {
            'Authorization': `Bearer ${config.whatsappApiToken}`,
            'Content-Type': 'application/json'
        }
    })
    .catch(error => console.error('Error sending error message:', error));
};

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
