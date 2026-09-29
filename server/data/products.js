const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const image = (filename) => `/images/${encodeURIComponent(filename)}`

export const seedProducts = [
  { slug: 'striped-tie-neck-blouse', name: 'Striped Tie-Neck Blouse', category: 'Tops', price: 3500, color: 'Blue', image: image('Top1.png'), sizes, stock: 12 },
  { slug: 'floral-print-camp-collar-blouse', name: 'Floral Print Camp Collar Blouse', category: 'Tops', price: 3000, color: 'Blue', image: image('Top2.png'), sizes, stock: 8 },
  { slug: 'sleeveless-peplum-blouse', name: 'Sleeveless Peplum Blouse', category: 'Tops', price: 4000, color: 'Orange', image: image('Top3.png'), sizes, stock: 5 },
  { slug: 'mint-green-floral-peplum-blouse', name: 'Mint Green Floral Peplum Blouse', category: 'Tops', price: 2500, color: 'Green', image: image('Top4.png'), sizes, stock: 7 },
  { slug: 'mint-green-polka-dot-tunic', name: 'Mint Green Tunic With Pink Polka Dots', category: 'Tops', price: 4500, color: 'Green', image: image('Top5.png'), sizes, stock: 4, dailyStyle: true },
  { slug: 'red-navy-striped-tunic', name: 'Red And Navy Blue Striped Kurta Tunic', category: 'Tops', price: 5000, color: 'Red', image: image('Top6.png'), sizes, stock: 0, sale: true, discountPercent: 30 },
  { slug: 'sleeveless-blue-printed-blouse', name: 'Sleeveless Blue Printed Blouse', category: 'Tops', price: 4500, color: 'Blue', image: image('Top7.png'), sizes, stock: 6 },
  { slug: 'navy-floral-button-blouse', name: 'Navy Floral Print Button Blouse', category: 'Tops', price: 2500, color: 'Blue', image: image('Top8.png'), sizes, stock: 9, dailyStyle: true },
  { slug: 'classic-black-midi-dress', name: 'Classic Black Midi Dress', category: 'Dresses', price: 3500, color: 'Black', image: image('Dress1.png'), sizes, stock: 8 },
  { slug: 'navy-gathered-dress', name: 'Navy Gathered Dress', category: 'Dresses', price: 3000, color: 'Blue', image: image('Dress2.png'), sizes, stock: 6 },
  { slug: 'beige-button-down-dress', name: 'Beige Button-Down Dress', category: 'Dresses', price: 4000, color: 'White', image: image('Dress3.png'), sizes, stock: 7 },
  { slug: 'pleated-beige-dress', name: 'Pleated Beige Dress', category: 'Dresses', price: 2500, color: 'White', image: image('Dress4.png'), sizes, stock: 9 },
  { slug: 'light-pink-flared-dress', name: 'Light Pink Flared Dress', category: 'Dresses', price: 4500, color: 'Pink', image: image('Dress5.png'), sizes, stock: 5 },
  { slug: 'seamless-black-midi-dress', name: 'Seamless Black Midi Dress', category: 'Dresses', price: 4500, color: 'Black', image: image('Dress7.png'), sizes: sizes.slice(2), stock: 3 },
  { slug: 'maroon-t-shirt', name: 'Maroon T-shirt', category: 'T-Shirts', price: 4500, color: 'Red', image: image('Tshirts1.png'), sizes, stock: 10 },
  { slug: 'hot-pink-t-shirt', name: 'Hot Pink T-shirt', category: 'T-Shirts', price: 3500, color: 'Pink', image: image('Tshirts2.png'), sizes, stock: 8, sale: true, discountPercent: 50 },
  { slug: 'olive-green-t-shirt', name: 'Olive Green T-shirt', category: 'T-Shirts', price: 5500, color: 'Green', image: image('Tshirts3.png'), sizes, stock: 7 },
  { slug: 'gray-t-shirt', name: 'Gray T-shirt', category: 'T-Shirts', price: 4500, color: 'White', image: image('Tshirts4.png'), sizes, stock: 11 },
  { slug: 'navy-blue-t-shirt', name: 'Navy Blue T-shirt', category: 'T-Shirts', price: 4000, color: 'Blue', image: image('Tshirts5.png'), sizes: sizes.slice(0, 5), stock: 3 },
  { slug: 'red-t-shirt', name: 'Red T-shirt', category: 'T-Shirts', price: 4500, color: 'Red', image: image('Tshirts6.png'), sizes, stock: 6, sale: true, discountPercent: 40 },
  { slug: 'olive-side-view-t-shirt', name: 'Olive Green Side View T-shirt', category: 'T-Shirts', price: 2500, color: 'Green', image: image('Tshirts7.png'), sizes: sizes.slice(1, 5), stock: 6 },
  { slug: 'printed-blazer', name: 'Printed Blazer', category: 'Blazers', price: 10500, color: 'Black', image: image('Blazers1.png'), sizes, stock: 5 },
  { slug: 'light-pink-suit-blazer', name: 'Light Pink Suit Blazer', category: 'Blazers', price: 8500, color: 'Pink', image: image('Blazers2.png'), sizes, stock: 4 },
  { slug: 'green-vest-blazer', name: 'Green Vest Blazer', category: 'Blazers', price: 9500, color: 'Green', image: image('Blazers3.png'), sizes, stock: 2 },
  { slug: 'coral-blazer', name: 'Coral Blazer', category: 'Blazers', price: 10500, color: 'Orange', image: image('Blazers4.png'), sizes, stock: 7 },
  { slug: 'light-blue-blazer', name: 'Light Blue Blazer', category: 'Blazers', price: 9500, color: 'Blue', image: image('Blazers5.png'), sizes, stock: 3 },
  { slug: 'soft-pink-blazer', name: 'Soft Pink Blazer', category: 'Blazers', price: 7500, color: 'Pink', image: image('Blazers6.png'), sizes, stock: 4 },
  { slug: 'orange-blazer', name: 'Orange Blazer', category: 'Blazers', price: 11500, color: 'Orange', image: image('Blazers7.png'), sizes, stock: 2, sale: true, discountPercent: 40 },
  { slug: 'linen-wide-leg-jumpsuit', name: 'Linen Wide-Leg Jumpsuit', category: 'Jumpsuits', price: 6500, color: 'White', image: image('Top9.png'), sizes, stock: 5 },
  { slug: 'black-pleated-skirt', name: 'Black Pleated Skirt', category: 'Skirts', price: 3500, color: 'Black', image: image('Top10.png'), sizes, stock: 7 },
  { slug: 'straight-leg-denim', name: 'Straight-Leg Denim Jeans', category: 'Jeans', price: 5500, color: 'Blue', image: image('Top11.png'), sizes, stock: 8 },
  { slug: 'tailored-shorts', name: 'Tailored Everyday Shorts', category: 'Shorts', price: 2500, color: 'White', image: image('Top12.png'), sizes, stock: 7 },
]

export const memoryProducts = seedProducts.map((product) => ({ ...product, sizes: [...product.sizes] }))