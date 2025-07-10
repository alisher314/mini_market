// script.js

// Initialize Telegram WebApp
// Check if the Telegram.WebApp object is available
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    // Show the "Send order to Telegram" button only if the app is launched within Telegram
    document.getElementById('send-order-btn').style.display = 'block';
} else {
    console.warn('Telegram WebApp API is not available. The application may not function fully.');
    // Optionally hide the button or show a message to the user
}

// Define the initial product data (fallback if localStorage is empty)
const defaultProductsData = [
    { id: '1', name: 'Пицца Пепперони', price: 12 },
    { id: '2', name: 'Бургер Классический', price: 8 },
    { id: '3', name: 'Салат Цезарь', price: 7 },
    { id: '4', name: 'Картофель фри', price: 4 },
    { id: '5', name: 'Кока-кола 0.5л', price: 2 },
    { id: '6', name: 'Мороженое Ванильное', price: 4 },
    { id: '7', name: 'Суши Сет "Филадельфия"', price: 25 },
    { id: '8', name: 'Паста Карбонара', price: 10 }
];

// Function to save products data to localStorage
function saveProductsToLocalStorage() {
    try {
        localStorage.setItem('productsData', JSON.stringify(productsData));
    } catch (e) {
        console.error('Ошибка при сохранении продуктов в localStorage:', e);
    }
}

// Function to load products data from localStorage
function loadProductsFromLocalStorage() {
    try {
        const storedData = localStorage.getItem('productsData');
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (e) {
        console.error('Ошибка при загрузке продуктов из localStorage:', e);
        // If there's an error parsing, clear the invalid data
        localStorage.removeItem('productsData');
    }
    return null; // Return null if no data or error
}

// Initialize productsData from localStorage or use default
let productsData = loadProductsFromLocalStorage() || defaultProductsData;

// Object to store items in the cart
let cart = {};

// Calculator state variables
let currentCalculatorValue = '';
let calculatorTargetProductId = null;
let calculatorTargetField = null; // 'quantity' or 'price'

// Get references to DOM elements
const mainOrderView = document.getElementById('main-order-view');
const productManagementView = document.getElementById('product-management-view');
const manageProductsBtn = document.getElementById('manage-products-btn');
const backToOrderBtn = document.getElementById('back-to-order-btn');

const productsListContainer = document.getElementById('products-list');
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceSpan = document.getElementById('total-price');
const sendOrderBtn = document.getElementById('send-order-btn');
const searchInput = document.getElementById('search-input');

const excelFileInput = document.getElementById('excel-file-input');
const loadExcelBtn = document.getElementById('load-excel-btn');
const uploadStatus = document.getElementById('upload-status');

const newProductNameInput = document.getElementById('new-product-name');
const newProductPriceInput = document.getElementById('new-product-price');
const addProductManualBtn = document.getElementById('add-product-manual-btn');
const addProductStatus = document.getElementById('add-product-status');
const manageProductsList = document.getElementById('manage-products-list');

const placeOrderBtn = document.getElementById('place-order-button');
const receiptOutput = document.getElementById('receipt-output');

// Calculator elements
const calculatorKeyboard = document.getElementById('calculator-keyboard');
const calculatorDisplay = document.getElementById('calculator-display');
const calcButtons = document.querySelectorAll('.calc-button');


// Helper function to switch between views
function showView(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        if (view.id === viewId) {
            view.classList.add('active');
            view.classList.remove('hidden');
        } else {
            view.classList.remove('active');
            view.classList.add('hidden');
        }
    });

    // Adjust Telegram MainButton visibility based on view
    if (window.Telegram && window.Telegram.WebApp) {
        if (viewId === 'main-order-view') {
            updateCartDisplay(); // Show MainButton if cart has items
        } else {
            window.Telegram.WebApp.MainButton.hide(); // Hide MainButton in management view
        }
    }
    // Always hide receipt and calculator when switching views
    receiptOutput.classList.add('hidden');
    calculatorKeyboard.classList.add('hidden');
}


// Function to render products for the main order view
function renderProducts(productsToRender) {
    productsListContainer.innerHTML = ''; // Clear current products
    if (productsToRender.length === 0) {
        productsListContainer.innerHTML = '<p style="text-align: center; color: #6c757d;">Товары не найдены.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.dataset.id = product.id;
        productItem.dataset.name = product.name;
        productItem.dataset.price = Math.round(product.price); // Ensure price is integer for display

        productItem.innerHTML = `
            <span>${product.name}</span>
            <span>${Math.round(product.price)} сум</span>
            <button class="add-to-cart">Добавить</button>
        `;
        productsListContainer.appendChild(productItem);
    });
}

// Function to render products for the product management view
function renderManageProductsList() {
    manageProductsList.innerHTML = ''; // Clear current products
    if (productsData.length === 0) {
        manageProductsList.innerHTML = '<p style="text-align: center; color: #6c757d;">Список продуктов пуст.</p>';
        return;
    }

    productsData.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'manage-product-item';
        productItem.dataset.id = product.id;

        productItem.innerHTML = `
            <span>${product.name} (${Math.round(product.price)} сум)</span>
            <button class="delete-product-btn" data-id="${product.id}">Удалить</button>
        `;
        manageProductsList.appendChild(productItem);
    });
}


// Function to update the cart display
function updateCartDisplay() {
    cartItemsContainer.innerHTML = ''; // Clear current cart items
    let total = 0;

    // Check if the cart is empty
    const cartIsEmpty = Object.keys(cart).length === 0;

    if (cartIsEmpty) {
        const placeholder = document.createElement('li');
        placeholder.className = 'cart-placeholder';
        placeholder.textContent = 'Ваша корзина пуста';
        cartItemsContainer.appendChild(placeholder);
    } else {
        for (const productId in cart) {
            const item = cart[productId];
            // Ensure item.price is treated as an integer for calculations
            const itemPrice = Math.round(item.price);
            const itemTotal = itemPrice * item.quantity;
            total += itemTotal;

            const li = document.createElement('li');
            li.className = 'cart-item';
            li.dataset.id = productId; // Add data-id for convenience

            li.innerHTML = `
                <div class="item-details">
                    <span>${item.name}</span>
                    <div class="item-inputs">
                        <label>Кол-во:</label>
                        <div class="quantity-controls">
                            <button class="quantity-btn decrement-btn" data-id="${productId}">-</button>
                            <span class="item-quantity-display" data-id="${productId}">${item.quantity}</span>
                            <button class="quantity-btn increment-btn" data-id="${productId}">+</button>
                        </div>
                        <label>Цена:</label>
                        <span class="item-price-display" data-id="${productId}">${itemPrice}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="remove-item" data-id="${productId}">Удалить</button>
                </div>
            `;
            cartItemsContainer.appendChild(li);
        }
    }

    totalPriceSpan.textContent = `${Math.round(total)} сум`;

    // Update Telegram MainButton state
    if (window.Telegram && window.Telegram.WebApp && mainOrderView.classList.contains('active')) {
        if (total > 0) {
            window.Telegram.WebApp.MainButton.setText(`Оформить заказ на ${Math.round(total)} сум`);
            window.Telegram.WebApp.MainButton.show();
            placeOrderBtn.style.display = 'block'; // Show "Оформить заказ" button
        } else {
            window.Telegram.WebApp.MainButton.hide();
            placeOrderBtn.style.display = 'none'; // Hide "Оформить заказ" button
        }
    } else {
        // If not in Telegram or in management view, manage the "Оформить заказ" button directly
        if (total > 0) {
            placeOrderBtn.style.display = 'block';
        } else {
            placeOrderBtn.style.display = 'none';
        }
    }
    // IMPORTANT: Do NOT hide receipt here. Receipt visibility is managed by other events.
}

// Event listener for clicks on "Add" and "Remove" buttons in product list and cart
productsListContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('add-to-cart')) {
        const productItem = event.target.closest('.product-item');
        const productId = productItem.dataset.id;
        const productName = productItem.dataset.name;
        // Parse price as integer
        const productPrice = parseInt(productItem.dataset.price);

        if (cart[productId]) {
            cart[productId].quantity++;
        } else {
            cart[productId] = {
                id: productId,
                name: productName,
                price: productPrice,
                quantity: 1
            };
        }
        updateCartDisplay();
        receiptOutput.classList.add('hidden'); // Hide receipt when adding item
    }
});

cartItemsContainer.addEventListener('click', (event) => {
    const target = event.target;
    const productId = target.dataset.id;

    if (!productId || !cart[productId]) {
        return; // If no ID or item not in cart, exit
    }

    // Handle quantity increment/decrement buttons
    if (target.classList.contains('increment-btn')) {
        cart[productId].quantity++;
        updateCartDisplay();
        receiptOutput.classList.add('hidden');
        return;
    }
    if (target.classList.contains('decrement-btn')) {
        cart[productId].quantity--;
        if (cart[productId].quantity < 1) {
            delete cart[productId]; // Remove if quantity drops to 0
        }
        updateCartDisplay();
        receiptOutput.classList.add('hidden');
        return;
    }

    // Handle clicks on quantity/price display spans to open calculator
    if (target.classList.contains('item-quantity-display')) {
        calculatorTargetProductId = productId;
        calculatorTargetField = 'quantity';
        currentCalculatorValue = String(cart[productId].quantity);
        calculatorDisplay.value = currentCalculatorValue;
        calculatorKeyboard.classList.remove('hidden');
        calculatorDisplay.focus();
        return;
    }
    if (target.classList.contains('item-price-display')) {
        calculatorTargetProductId = productId;
        calculatorTargetField = 'price';
        currentCalculatorValue = String(cart[productId].price);
        calculatorDisplay.value = currentCalculatorValue;
        calculatorKeyboard.classList.remove('hidden');
        calculatorDisplay.focus();
        return;
    }

    if (target.classList.contains('remove-item')) {
        delete cart[productId]; // Completely remove item
    }
    updateCartDisplay();
    receiptOutput.classList.add('hidden'); // Hide receipt when removing item
});

// Calculator button click handler
calcButtons.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.dataset.value;

        if (value === 'C') { // Clear
            currentCalculatorValue = '';
        } else if (value === 'Del') { // Delete last character
            currentCalculatorValue = currentCalculatorValue.slice(0, -1);
        } else if (value === 'OK') { // Confirm and apply
            const parsedValue = parseFloat(currentCalculatorValue);

            if (calculatorTargetProductId && cart[calculatorTargetProductId]) {
                if (calculatorTargetField === 'quantity') {
                    if (isNaN(parsedValue) || parsedValue < 1) {
                        if (parsedValue === 0) { // If explicitly typed 0, delete item
                            delete cart[calculatorTargetProductId];
                        } else {
                            // Invalid input, revert to previous valid quantity
                            // No action needed here, updateCartDisplay will refresh from cart
                        }
                    } else {
                        cart[calculatorTargetProductId].quantity = parsedValue;
                    }
                } else if (calculatorTargetField === 'price') {
                    if (isNaN(parsedValue) || parsedValue < 0) {
                        // Invalid input, revert to previous valid price
                        // No action needed here
                    } else {
                        cart[calculatorTargetProductId].price = parsedValue;
                    }
                }
            }
            // Reset calculator state and hide
            currentCalculatorValue = '';
            calculatorTargetProductId = null;
            calculatorTargetField = null;
            calculatorKeyboard.classList.add('hidden');
            updateCartDisplay(); // Re-render cart to reflect changes
            receiptOutput.classList.add('hidden'); // Hide receipt after editing
            return; // Exit function after OK
        } else if (value === '+500') {
            if (calculatorTargetField === 'price') {
                currentCalculatorValue = String(parseFloat(currentCalculatorValue || '0') + 500);
            }
        } else if (value === '-500') {
            if (calculatorTargetField === 'price') {
                let tempValue = parseFloat(currentCalculatorValue || '0') - 500;
                currentCalculatorValue = String(Math.max(0, tempValue)); // Ensure price doesn't go below 0
            }
        } else {
            // Append number or dot
            if (value === '.') {
                // Only allow one dot
                if (!currentCalculatorValue.includes('.')) {
                    currentCalculatorValue += value;
                }
            } else {
                currentCalculatorValue += value;
            }
        }
        calculatorDisplay.value = currentCalculatorValue;
    });
});


// Event listener for the "Send order to Telegram" button
sendOrderBtn.addEventListener('click', () => {
    sendOrderToTelegram();
});

// Event listener for Telegram WebApp MainButton
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.MainButton.onClick(sendOrderToTelegram);
}

// Function to send order data to Telegram
function sendOrderToTelegram() {
    let orderDetails = [];
    let totalAmount = 0;

    for (const productId in cart) {
        const item = cart[productId];
        const itemPrice = Math.round(item.price); // Ensure price is rounded for message
        orderDetails.push(`${item.name} x ${item.quantity} (${(itemPrice * item.quantity)} сум)`);
        totalAmount += itemPrice * item.quantity;
    }

    let message = "Ваш заказ:\n\n";
    if (orderDetails.length === 0) {
        message += "Корзина пуста.";
    } else {
        message += orderDetails.join('\n');
        message += `\n\nИтого: ${Math.round(totalAmount)} сум`;
    }

    // Send data back to Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.sendData(message);
    } else {
        console.log("Simulating sending order to Telegram:");
        console.log(message);
        // Using a custom modal/message box instead of alert()
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            text-align: center;
            max-width: 90%;
            font-family: Arial, sans-serif;
            color: #333;
        `;
        messageBox.innerHTML = `
            <h3>Заказ сформирован:</h3>
            <p>${message}</p>
            <button style="
                background-color: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 15px;
            " onclick="this.parentNode.remove()">Закрыть</button>
        `;
        document.body.appendChild(messageBox);
    }
}

// Event listener for search input
searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredProducts = productsData.filter(product =>
        product.name.toLowerCase().includes(searchTerm)
    );
    renderProducts(filteredProducts); // Render only the filtered products
    receiptOutput.classList.add('hidden'); // Hide receipt when searching
});

// Event listener for loading Excel file
loadExcelBtn.addEventListener('click', () => {
    const file = excelFileInput.files[0];
    if (!file) {
        uploadStatus.textContent = 'Пожалуйста, выберите файл Excel.';
        uploadStatus.style.color = 'red';
        return;
    }

    uploadStatus.textContent = 'Загрузка...';
    uploadStatus.style.color = '#666';

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume the first sheet contains product data
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert sheet to JSON, assuming headers are in the first row
            const jsonProducts = XLSX.utils.sheet_to_json(worksheet);

            // Map JSON data to our productsData format
            const newProducts = jsonProducts.map((row, index) => {
                // Assuming columns are 'Название' и 'Цена'
                // You might need to adjust these keys based on your Excel file's header names
                const name = row['Название'] || row['name'] || `Товар ${index + 1}`;
                let price = parseFloat(row['Цена']) || parseFloat(row['price']) || 0;

                // Round price to nearest integer
                price = Math.round(price);

                return {
                    id: `excel-${Date.now()}-${index}`, // Generate unique ID for Excel products
                    name: String(name),
                    price: price
                };
            }).filter(product => product.name && product.price >= 0); // Filter out invalid entries

            if (newProducts.length > 0) {
                productsData = newProducts; // Overwrite existing products
                renderProducts(productsData); // Re-render products in main view
                renderManageProductsList(); // Re-render products in management view
                cart = {}; // Clear cart when new products are loaded
                updateCartDisplay();
                uploadStatus.textContent = `Успешно загружено ${newProducts.length} товаров.`;
                uploadStatus.style.color = 'green';
                saveProductsToLocalStorage(); // Save updated products to localStorage
            } else {
                uploadStatus.textContent = 'Не удалось найти товары в файле Excel. Убедитесь, что есть колонки "Название" и "Цена".';
                uploadStatus.style.color = 'orange';
            }
            receiptOutput.classList.add('hidden'); // Hide receipt after loading new products

        } catch (error) {
            console.error('Ошибка чтения Excel файла:', error);
            uploadStatus.textContent = `Ошибка чтения файла: ${error.message}`;
            uploadStatus.style.color = 'red';
        }
    };
    reader.onerror = (error) => {
        console.error('Ошибка FileReader:', error);
        uploadStatus.textContent = `Ошибка чтения файла: ${error.message}`;
        uploadStatus.style.color = 'red';
    };
    reader.readAsArrayBuffer(file);
});

// Event listener for adding a product manually
addProductManualBtn.addEventListener('click', () => {
    const name = newProductNameInput.value.trim();
    const price = parseInt(newProductPriceInput.value);

    if (!name || isNaN(price) || price < 0) {
        addProductStatus.textContent = 'Пожалуйста, введите корректное название и цену.';
        addProductStatus.style.color = 'red';
        return;
    }

    const newProduct = {
        id: `manual-${Date.now()}`, // Unique ID for manually added products
        name: name,
        price: price
    };

    productsData.push(newProduct); // Add new product to the array
    renderProducts(productsData); // Update main product list
    renderManageProductsList(); // Update management product list
    saveProductsToLocalStorage(); // Save updated products to localStorage
    
    // Clear input fields
    newProductNameInput.value = '';
    newProductPriceInput.value = '';
    addProductStatus.textContent = `Продукт "${name}" добавлен.`;
    addProductStatus.style.color = 'green';
    receiptOutput.classList.add('hidden'); // Hide receipt after adding product
});

// Event listener for deleting a product from the management list
manageProductsList.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-product-btn')) {
        const productIdToDelete = event.target.dataset.id;
        
        // Remove product from productsData array
        productsData = productsData.filter(product => product.id !== productIdToDelete);
        
        // Also remove from cart if it was there
        if (cart[productIdToDelete]) {
            delete cart[productIdToDelete];
            updateCartDisplay(); // Update cart display if item was removed
        }

        renderProducts(productsData); // Update main product list
        renderManageProductsList(); // Update management product list
        saveProductsToLocalStorage(); // Save updated products to localStorage
        receiptOutput.classList.add('hidden'); // Hide receipt after deleting product
    }
});


// Event listeners for view switching
manageProductsBtn.addEventListener('click', () => {
    showView('product-management-view');
    renderManageProductsList(); // Render the list when entering management view
});

backToOrderBtn.addEventListener('click', () => {
    showView('main-order-view');
    searchInput.value = ''; // Clear search when returning to main view
    renderProducts(productsData); // Re-render all products
});

// Helper function to format numbers with spaces as thousands separators
function formatNumberWithSpaces(number) {
    return new Intl.NumberFormat('ru-RU').format(number);
}

// New event listener for "Оформить заказ" button
placeOrderBtn.addEventListener('click', () => {
    let receiptContent = '';
    let totalAmount = 0;

    if (Object.keys(cart).length === 0) {
        receiptContent = 'Ваша корзина пуста. Добавьте товары для оформления заказа.';
    } else {
        for (const productId in cart) {
            const item = cart[productId];
            const itemPrice = Math.round(item.price);
            const itemTotal = itemPrice * item.quantity;
            totalAmount += itemTotal;

            // Use \n for line breaks in the text content for clipboard,
            // and ** for bold in Telegram Markdown.
            // Apply formatNumberWithSpaces to prices and totals
            receiptContent += `**${item.name}**\n`;
            receiptContent += `${item.quantity}шт * ${formatNumberWithSpaces(itemPrice)} = ${formatNumberWithSpaces(itemTotal)} сум\n\n`;
        }

        receiptContent += `===========================\n`;
        receiptContent += `**Общая сумма = ${formatNumberWithSpaces(Math.round(totalAmount))} сум**\n\n`;
        receiptContent += `Спасибо за покупку!`;
    }

    // For display in HTML, replace \n with <br>
    receiptOutput.innerHTML = receiptContent.replace(/\n/g, '<br>');
    receiptOutput.classList.remove('hidden'); // Show the receipt

    // Add a copy button after the receipt is generated
    let copyButton = document.getElementById('copy-receipt-button');
    if (!copyButton) {
        copyButton = document.createElement('button');
        copyButton.id = 'copy-receipt-button';
        copyButton.className = 'secondary-button'; // Reusing secondary-button style
        copyButton.textContent = 'Скопировать заказ';
        copyButton.style.marginTop = '15px'; // Add some margin
        // Insert after receiptOutput, which is a child of main-order-view
        receiptOutput.parentNode.insertBefore(copyButton, receiptOutput.nextSibling);
        copyButton.addEventListener('click', copyReceiptToClipboard);
    } else {
        copyButton.style.display = 'block'; // Show if already exists
    }


    // Optionally clear the cart after placing the order
    cart = {};
    updateCartDisplay(); // Update cart display to show it's empty, but do NOT hide receipt here
});


// Function to copy receipt text to clipboard
function copyReceiptToClipboard() {
    // Get the text content from the receiptOutput div, which already has the Telegram formatting (\n, **)
    // We need to get innerText to exclude the <br> tags used for HTML display.
    const textToCopy = receiptOutput.innerText; 

    // Create a temporary textarea element to hold the text
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = textToCopy;
    document.body.appendChild(tempTextArea);

    // Select the text in the textarea
    tempTextArea.select();
    tempTextArea.setSelectionRange(0, 99999); // For mobile devices

    try {
        // Copy the text to the clipboard
        document.execCommand('copy');
        // Optionally provide feedback to the user
        const originalText = this.textContent;
        this.textContent = 'Скопировано!';
        setTimeout(() => {
            this.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Не удалось скопировать текст: ', err);
        // Using a custom modal/message box instead of alert() for fallback
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            text-align: center;
            max-width: 90%;
            font-family: Arial, sans-serif;
            color: #333;
        `;
        messageBox.innerHTML = `
            <h3>Ошибка копирования</h3>
            <p>Не удалось скопировать текст автоматически. Пожалуйста, выделите текст в чеке и скопируйте вручную.</p>
            <button style="
                background-color: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 15px;
            " onclick="this.parentNode.remove()">Закрыть</button>
        `;
        document.body.appendChild(messageBox);
    } finally {
        // Remove the temporary textarea
        document.body.removeChild(tempTextArea);
    }
}


// Initialization on page load
document.addEventListener('DOMContentLoaded', () => {
    showView('main-order-view'); // Show main order view by default
    renderProducts(productsData); // Initially render all products
    updateCartDisplay(); // Initially update cart (will be empty)
});
