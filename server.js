const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const axios = require('axios');
require('dotenv').config(); // Tambahkan ini untuk membaca file .env

const app = express();
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'altomedia'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database.');
});

let userSelections = {}; // Untuk menyimpan pilihan produk pengguna

// Fungsi untuk mengirim pesan teks
function sendMessage(to, message) {
    const data = {
        to: to,
        type: 'text',
        text: { body: message }
    };

    axios.post('https://api.whatsapp.com/v1/messages', data, {
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`, // Gunakan variabel lingkungan
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Message sent:', response.data);
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });
}

// Fungsi untuk mengirim pesan dengan media dan tombol
function sendMediaMessage(to, body, imageUrl, buttons) {
    const data = {
        to: to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: body },
            media: {
                type: 'image',
                image: { link: imageUrl }
            },
            action: {
                buttons: buttons
            }
        }
    };

    axios.post('https://api.whatsapp.com/v1/messages', data, {
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`, // Gunakan variabel lingkungan
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Media message sent:', response.data);
    })
    .catch(error => {
        console.error('Error sending media message:', error);
    });
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    const message = req.body;
    const sender = message.from;
    const text = message.text.body.toLowerCase();

    if (text.includes('info') || text === 'hi' || text === 'halo') {
        const welcomeMessage = "Selamat datang di ALTOMEDIA, kami menyediakan produk media sosial di bawah ini";
        sendMessage(sender, welcomeMessage);

        db.query('SELECT * FROM products LIMIT 6', (err, results) => {
            if (err) {
                console.error('Error fetching products:', err);
                return;
            }

            const groupedProducts = [];
            for (let i = 0; i < results.length; i += 2) {
                groupedProducts.push(results.slice(i, i + 2));
            }

            groupedProducts.forEach(group => {
                group.forEach(product => {
                    const buttons = [
                        { type: 'reply', reply: { id: `detail_${product.id}`, title: 'Detail' } },
                        { type: 'reply', reply: { id: `beli_${product.id}`, title: 'Beli' } }
                    ];
                    const body = `${product.name} - Rp${product.price}`;
                    sendMediaMessage(sender, body, product.imageUrl, buttons);
                });
            });
        });
    } else if (text.startsWith('detail_')) {
        const productId = text.split('_')[1];
        db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
            if (err) {
                console.error('Error fetching product details:', err);
                return;
            }
            const product = results[0];
            const response = `${product.name}\nHarga: Rp${product.price}\nDeskripsi: ${product.description}`;
            sendMessage(sender, response);

            db.query('SELECT * FROM products LIMIT 5', (err, products) => {
                if (err) {
                    console.error('Error fetching products:', err);
                    return;
                }

                products.forEach(prod => {
                    const quantityButtons = Array.from({ length: 10 }, (_, i) => ({
                        type: 'reply',
                        reply: { id: `quantity_${prod.id}_${i + 1}`, title: (i + 1).toString() }
                    }));

                    sendMediaMessage(sender, `Pilih jumlah untuk ${prod.name} (harga: Rp${prod.price}):`, prod.imageUrl, quantityButtons);
                });

                const confirmButton = { type: 'reply', reply: { id: 'confirm_purchase', title: 'BELI' } };
                sendMessage(sender, 'Ketik "BELI" untuk menyelesaikan pembelian setelah memilih jumlah produk.');
                sendMessage(sender, 'Tekan tombol di bawah untuk melanjutkan pembelian.', [confirmButton]);
            });
        });
    } else if (text.startsWith('quantity_')) {
        const [_, productId, quantity] = text.split('_');
        userSelections[sender] = userSelections[sender] || [];
        userSelections[sender].push({ productId: parseInt(productId), quantity: parseInt(quantity) });

        sendMessage(sender, `Anda memilih ${quantity} unit produk ID ${productId}. Ketik "BELI" untuk menyelesaikan pembelian.`);
    } else if (text === 'beli') {
        if (!userSelections[sender] || userSelections[sender].length === 0) {
            sendMessage(sender, 'Anda belum memilih produk.');
            return;
        }

        let totalPrice = 0;
        let productDetails = '';
        userSelections[sender].forEach(selection => {
            db.query('SELECT * FROM products WHERE id = ?', [selection.productId], (err, results) => {
                if (err) {
                    console.error('Error fetching product details:', err);
                    return;
                }

                const product = results[0];
                const price = product.price * selection.quantity;
                totalPrice += price;
                productDetails += `${product.name} - ${selection.quantity} unit(s): Rp${price}\n`;
            });
        });

        // Tunggu sampai userSelections terisi
        setTimeout(() => {
            const qrCodeUrl = process.env.QR_CODE_URL;
            const paymentInfo = `
                **Total Pembayaran:** Rp${totalPrice}
                **QR Code untuk Pembayaran:** ${qrCodeUrl}
                **Info Rekening:** [Masukkan info rekening Anda di sini]
                **Petunjuk Pembayaran:** Scan QR Code di atas untuk melakukan pembayaran. Setelah pembayaran selesai, harap konfirmasi dengan mengirimkan bukti pembayaran ke sini.
            `;

            sendMessage(sender, paymentInfo);
            delete userSelections[sender]; // Hapus pilihan setelah pembelian
        }, 1000);  // Tunggu 1 detik agar semua detail produk selesai diambil
    } else {
        sendMessage(sender, 'Perintah tidak dikenali. Ketik "info" untuk melihat produk.');
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
