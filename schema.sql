CREATE DATABASE altomedia;

USE altomedia;

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    imageUrl VARCHAR(255) NOT NULL
);

INSERT INTO products (name, price, description, imageUrl) VALUES
('Produk 1', 100000, 'Deskripsi produk 1', 'https://example.com/image1.jpg'),
('Produk 2', 200000, 'Deskripsi produk 2', 'https://example.com/image2.jpg'),
('Produk 3', 300000, 'Deskripsi produk 3', 'https://example.com/image3.jpg'),
('Produk 4', 400000, 'Deskripsi produk 4', 'https://example.com/image4.jpg'),
('Produk 5', 500000, 'Deskripsi produk 5', 'https://example.com/image5.jpg'),
('Produk 6', 600000, 'Deskripsi produk 6', 'https://example.com/image6.jpg');
